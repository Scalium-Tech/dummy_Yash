import express, { Request, Response } from 'express';
import cors from 'cors';
import Razorpay from 'razorpay';
import crypto from 'crypto';

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Razorpay instance
// Replace with your actual Razorpay API keys
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_YOUR_KEY_ID',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'YOUR_KEY_SECRET',
});

// Create Order endpoint
app.post('/api/create-order', async (req: Request, res: Response) => {
    try {
        const { amount, currency = 'INR' } = req.body;

        const options = {
            amount: amount, // amount in smallest currency unit (paise)
            currency: currency,
            receipt: `receipt_${Date.now()}`,
        };

        const order = await razorpay.orders.create(options);

        console.log('Order created:', order.id);

        res.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
        });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ error: 'Failed to create order' });
    }
});

// Verify Payment endpoint
app.post('/api/verify-payment', (req: Request, res: Response) => {
    try {
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

        // Create signature using HMAC SHA256
        const keySecret = process.env.RAZORPAY_KEY_SECRET || 'YOUR_KEY_SECRET';
        const body = razorpay_order_id + '|' + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac('sha256', keySecret)
            .update(body)
            .digest('hex');

        const isValid = expectedSignature === razorpay_signature;

        if (isValid) {
            console.log('Payment verified successfully:', razorpay_payment_id);
            res.json({ verified: true, paymentId: razorpay_payment_id });
        } else {
            console.log('Payment verification failed');
            res.status(400).json({ verified: false, error: 'Invalid signature' });
        }
    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({ verified: false, error: 'Verification failed' });
    }
});

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log('📝 Make sure to set your Razorpay API keys:');
    console.log('   - RAZORPAY_KEY_ID');
    console.log('   - RAZORPAY_KEY_SECRET');
});
