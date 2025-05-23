import { db } from '$lib/services/firebase';
import { collection, doc, getDoc, getDocs, query, where, orderBy, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

export interface Transaction {
    id: string;
    userId: string;
    type: 'deposit' | 'withdrawal';
    amount: number;
    description: string;
    date: Date;
    balance: number;
}

export class TransactionModel {
    static async createTransaction(
        userId: string,
        type: 'deposit' | 'withdrawal',
        amount: number,
        description: string
    ): Promise<Transaction> {
        // Get user's current balance
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (!userDoc.exists()) {
            throw new Error('User not found');
        }

        const userData = userDoc.data();
        const currentBalance = userData.balance || 0;

        // Validate transaction
        if (amount <= 0) {
            throw new Error('Amount must be greater than 0');
        }

        if (type === 'withdrawal' && amount > currentBalance) {
            throw new Error('Insufficient funds');
        }

        // Calculate new balance
        const newBalance = type === 'deposit' 
            ? currentBalance + amount 
            : currentBalance - amount;

        // Create transaction
        const transactionRef = await addDoc(collection(db, 'transactions'), {
            userId,
            type,
            amount,
            description,
            date: serverTimestamp(),
            balance: newBalance
        });

        // Update user's balance
        await updateDoc(doc(db, 'users', userId), {
            balance: newBalance
        });

        // Get the created transaction
        const transactionDoc = await getDoc(transactionRef);
        if (!transactionDoc.exists()) {
            throw new Error('Failed to create transaction');
        }

        const transactionData = transactionDoc.data();
        return {
            id: transactionDoc.id,
            userId: transactionData.userId,
            type: transactionData.type,
            amount: transactionData.amount,
            description: transactionData.description,
            date: transactionData.date.toDate(),
            balance: transactionData.balance
        };
    }

    static async getUserTransactions(userId: string): Promise<Transaction[]> {
        const transactionsQuery = query(
            collection(db, 'transactions'),
            where('userId', '==', userId),
            orderBy('date', 'desc')
        );

        const querySnapshot = await getDocs(transactionsQuery);
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                userId: data.userId,
                type: data.type,
                amount: data.amount,
                description: data.description,
                date: data.date.toDate(),
                balance: data.balance
            };
        });
    }
} 