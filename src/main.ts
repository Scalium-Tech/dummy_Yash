// TypeScript interfaces for Razorpay
interface RazorpayOptions {
    key: string;
    amount: number;
    currency: string;
    name: string;
    description: string;
    order_id: string;
    handler: (response: RazorpayResponse) => void;
    prefill: {
        name: string;
        email: string;
        contact: string;
    };
    theme: {
        color: string;
    };
    modal?: {
        ondismiss?: () => void;
    };
}

interface RazorpayResponse {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
}

interface OrderResponse {
    orderId: string;
    amount: number;
    currency: string;
}

declare class Razorpay {
    constructor(options: RazorpayOptions);
    open(): void;
}

// Product configuration
const PRODUCT = {
    name: 'Premium Wireless Headphones Pro',
    description: 'High-quality wireless headphones with ANC',
    amount: 29900, // Amount in paise (₹299)
    currency: 'INR',
};

// DOM Elements
const buyBtn = document.getElementById('buyBtn') as HTMLButtonElement;
const successModal = document.getElementById('successModal') as HTMLDivElement;
const errorModal = document.getElementById('errorModal') as HTMLDivElement;
const orderIdSpan = document.getElementById('orderId') as HTMLSpanElement;
const paymentIdSpan = document.getElementById('paymentId') as HTMLSpanElement;
const errorMessage = document.getElementById('errorMessage') as HTMLParagraphElement;

// Close modal function (exposed globally)
(window as Window & { closeModal: () => void }).closeModal = () => {
    successModal.classList.remove('active');
    errorModal.classList.remove('active');
};

// Also export for use in HTML onclick
function closeModal(): void {
    successModal.classList.remove('active');
    errorModal.classList.remove('active');
}

// Show success modal
function showSuccess(orderId: string, paymentId: string): void {
    orderIdSpan.textContent = orderId;
    paymentIdSpan.textContent = paymentId;
    successModal.classList.add('active');
}

// Show error modal
function showError(message: string): void {
    errorMessage.textContent = message;
    errorModal.classList.add('active');
}

// Create order on backend
async function createOrder(): Promise<OrderResponse> {
    const response = await fetch('/api/create-order', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            amount: PRODUCT.amount,
            currency: PRODUCT.currency,
        }),
    });

    if (!response.ok) {
        throw new Error('Failed to create order');
    }

    return response.json();
}

// Verify payment on backend
async function verifyPayment(
    paymentId: string,
    orderId: string,
    signature: string
): Promise<boolean> {
    const response = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            razorpay_payment_id: paymentId,
            razorpay_order_id: orderId,
            razorpay_signature: signature,
        }),
    });

    if (!response.ok) {
        throw new Error('Payment verification failed');
    }

    const data = await response.json();
    return data.verified;
}

// Initialize Razorpay payment
async function initiatePayment(): Promise<void> {
    buyBtn.classList.add('loading');
    buyBtn.disabled = true;

    try {
        // Step 1: Create order on backend
        const order = await createOrder();

        // Step 2: Configure Razorpay options
        const options: RazorpayOptions = {
            key: 'rzp_test_YOUR_KEY_HERE', // Replace with your test key
            amount: order.amount,
            currency: order.currency,
            name: 'TechVault',
            description: PRODUCT.description,
            order_id: order.orderId,
            handler: async (response: RazorpayResponse) => {
                try {
                    // Step 3: Verify payment
                    const verified = await verifyPayment(
                        response.razorpay_payment_id,
                        response.razorpay_order_id,
                        response.razorpay_signature
                    );

                    if (verified) {
                        showSuccess(response.razorpay_order_id, response.razorpay_payment_id);
                    } else {
                        showError('Payment verification failed. Please contact support.');
                    }
                } catch {
                    showError('Payment verification failed. Please try again.');
                }
            },
            prefill: {
                name: 'Test User',
                email: 'test@example.com',
                contact: '9876543210',
            },
            theme: {
                color: '#8b5cf6',
            },
            modal: {
                ondismiss: () => {
                    buyBtn.classList.remove('loading');
                    buyBtn.disabled = false;
                },
            },
        };

        // Step 4: Open Razorpay checkout
        const razorpay = new Razorpay(options);
        razorpay.open();
    } catch (error) {
        console.error('Payment initiation failed:', error);
        showError('Unable to initiate payment. Please try again.');
    } finally {
        buyBtn.classList.remove('loading');
        buyBtn.disabled = false;
    }
}

// Event listener
buyBtn.addEventListener('click', initiatePayment);

// Close modal on backdrop click
[successModal, errorModal].forEach((modal) => {
    modal.addEventListener('click', (e: MouseEvent) => {
        if (e.target === modal) {
            closeModal();
        }
    });
});

// Close modal on Escape key
document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
        closeModal();
    }
});

console.log('🚀 TechVault Payment Demo Ready!');
console.log('📝 Note: Replace "rzp_test_YOUR_KEY_HERE" with your actual Razorpay test key');
