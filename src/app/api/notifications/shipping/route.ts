import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, customerEmail, trackingNumber, status } = body;

    // Get order details from Firestore
    const orderRef = doc(db, 'orders', orderId);
    const orderDoc = await getDoc(orderRef);
    
    if (!orderDoc.exists()) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    const order = orderDoc.data();

    // Here you would integrate with your notification service
    // For example, using SendGrid, Mailchimp, or a custom email service
    // This is a mock implementation
    const mockNotificationResponse = {
      success: true,
      message: 'Notification sent successfully',
      notification: {
        to: customerEmail,
        subject: `Order ${orderId} Shipping Update`,
        body: `Your order #${orderId} is now ${status}. Tracking number: ${trackingNumber}`,
      },
    };

    return NextResponse.json(mockNotificationResponse);
  } catch (error) {
    console.error('Error sending notification:', error);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
} 