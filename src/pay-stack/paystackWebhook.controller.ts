import {
  Controller,
  Post,
  Req,
  Res,
  HttpStatus,
  Headers,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';
import { WalletService } from 'src/wallet/wallet.service';

@Controller('webhooks')
export class PaystackWebhookController {
  private readonly logger = new Logger(PaystackWebhookController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
  ) {}

  @Post('paystack')
  async handlePaystackWebhook(
    @Req() req: Request,
    @Res() res: Response,
    @Headers('x-paystack-signature') signature: string,
  ) {
    const secret = process.env.PAYSTACK_SECRET_KEY;

    if (!secret) {
      this.logger.error('PAYSTACK_SECRET_KEY not set');
      return res.sendStatus(HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // Ensure rawBody is used for signature verification
    const rawBody = (req as any).rawBody;
    const hash = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');

    if (hash !== signature) {
      this.logger.warn('Invalid Paystack webhook signature');
      return res.status(HttpStatus.FORBIDDEN).send('Invalid signature');
    }

    const event = req.body.event;
    const data = req.body.data;

    try {
      if (event === 'charge.success') {
        const { metadata, amount, currency, reference, paid_at } = data;

        const userId: string = metadata?.userId;
        const type: string = metadata?.type;

        if (type === 'deposit' && userId) {
          await this.walletService.confirmDeposit(userId, reference);
          this.logger.log(`Deposit confirmed for user ${userId}, reference ${reference}`);
        } else if (type === 'bill') {
          const categoryId: string = metadata?.categoryId;
          const description: string = metadata?.description || 'Bill payment';
          const dueDate = metadata?.dueDate ? new Date(metadata.dueDate) : new Date();
          
          if (!userId || !categoryId) {
            this.logger.error('Missing userId or categoryId in metadata');
            return res.status(HttpStatus.BAD_REQUEST).send('Missing metadata');
          }
          // Idempotency: check if bill already exists
          const exists = await this.prisma.bill.findUnique({
            where: { reference },
          });
  
          if (!exists) {
            await this.prisma.bill.create({
              data: {
                userId,
                categoryId,
                amount: amount / 100, // convert kobo to naira
                currency,
                billStatus: 'PAID', // since charge.success
                reference,
                paidAt: paid_at ? new Date(paid_at) : new Date(),
                description,
                dueDate,
              },
            });
  
            this.logger.log(`Bill created for user ${userId}, reference ${reference}`);
          }
        }



      } else if (event === 'charge.failed') {
        const { reference } = data;

        // Mark the bill as failed if it exists
        await this.prisma.bill.updateMany({
          where: { reference },
          data: { billStatus: 'PENDING' }, // or create a FAILED status if needed
        });

        this.logger.warn(`Charge failed for reference ${reference}`);
      }
    } catch (error) {
      this.logger.error('Error handling Paystack webhook', error);
      return res.sendStatus(HttpStatus.INTERNAL_SERVER_ERROR);
    }

    return res.sendStatus(HttpStatus.OK);
  }
}

