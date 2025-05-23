import { TransactionModel, type Transaction } from '$lib/models/Transaction';

export class TransactionController {
    static async createTransaction(
        userId: string,
        type: 'deposit' | 'withdrawal',
        amount: number,
        description: string
    ): Promise<Transaction> {
        try {
            // Validate input
            if (!userId) {
                throw new Error('User ID is required');
            }

            if (!type || !['deposit', 'withdrawal'].includes(type)) {
                throw new Error('Invalid transaction type');
            }

            if (!amount || amount <= 0) {
                throw new Error('Amount must be greater than 0');
            }

            if (!description) {
                throw new Error('Description is required');
            }

            // Create transaction
            return await TransactionModel.createTransaction(
                userId,
                type,
                amount,
                description
            );
        } catch (error) {
            console.error('Error creating transaction:', error);
            throw error;
        }
    }

    static async getUserTransactions(userId: string): Promise<Transaction[]> {
        try {
            if (!userId) {
                throw new Error('User ID is required');
            }

            return await TransactionModel.getUserTransactions(userId);
        } catch (error) {
            console.error('Error getting user transactions:', error);
            throw error;
        }
    }
} 