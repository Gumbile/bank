import { db } from '$lib/services/firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';

export interface Account {
    id: string;
    customerId: string;
    balance: number;
    status: 'Active' | 'Inactive' | 'Frozen';
    createdAt: Date;
}

export interface Transaction {
    id: string;
    accountId: string;
    type: 'Deposit' | 'Withdrawal';
    amount: number;
    timestamp: Date;
    description: string;
}

export interface Transfer {
    id: string;
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    timestamp: Date;
}

export class AccountModel {
    static async getAccount(accountId: string): Promise<Account | null> {
        const accountDoc = await getDoc(doc(db, 'Accounts', accountId));
        if (!accountDoc.exists()) {
            return null;
        }

        const data = accountDoc.data();
        return {
            id: accountDoc.id,
            customerId: data.customerId,
            balance: data.balance,
            status: data.status,
            createdAt: data.createdAt.toDate()
        };
    }

    static async getCustomerAccounts(customerId: string): Promise<Account[]> {
        const accountsRef = collection(db, 'Accounts');
        const q = query(accountsRef, where('customerId', '==', customerId));
        const querySnapshot = await getDocs(q);

        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                customerId: data.customerId,
                balance: data.balance,
                status: data.status,
                createdAt: data.createdAt.toDate()
            };
        });
    }

    static async createAccount(customerId: string): Promise<Account> {
        const accountData = {
            customerId,
            balance: 0,
            status: 'Active',
            createdAt: serverTimestamp()
        };

        const accountRef = await addDoc(collection(db, 'Accounts'), accountData);
        const accountDoc = await getDoc(accountRef);
        const data = accountDoc.data();
        
        if (!data) {
            throw new Error('Failed to create account');
        }

        return {
            id: accountDoc.id,
            customerId: data.customerId,
            balance: data.balance,
            status: data.status,
            createdAt: data.createdAt.toDate()
        };
    }

    static async updateBalance(accountId: string, newBalance: number): Promise<void> {
        await updateDoc(doc(db, 'Accounts', accountId), {
            balance: newBalance
        });
    }

    static async updateStatus(accountId: string, status: 'Active' | 'Inactive' | 'Frozen'): Promise<void> {
        await updateDoc(doc(db, 'Accounts', accountId), {
            status
        });
    }

    static async createTransaction(
        accountId: string,
        type: 'Deposit' | 'Withdrawal',
        amount: number,
        description: string
    ): Promise<Transaction> {
        const account = await this.getAccount(accountId);
        if (!account) {
            throw new Error('Account not found');
        }

        if (type === 'Withdrawal' && amount > account.balance) {
            throw new Error('Insufficient funds');
        }

        const newBalance = type === 'Deposit' 
            ? account.balance + amount 
            : account.balance - amount;

        // Update account balance
        await this.updateBalance(accountId, newBalance);

        const transactionData = {
            accountId,
            type,
            amount,
            timestamp: serverTimestamp(),
            description
        };

        const transactionRef = await addDoc(
            collection(db, 'Transactions'),
            transactionData
        );

        const transactionDoc = await getDoc(transactionRef);
        const data = transactionDoc.data();
        if (!data) {
            throw new Error('Failed to create transaction');
        }
        return {
            id: transactionDoc.id,
            accountId: data.accountId,
            type: data.type,
            amount: data.amount,
            timestamp: data.timestamp.toDate(),
            description: data.description
        };
    }

    static async getTransactions(accountId: string): Promise<Transaction[]> {
        const transactionsRef = collection(db, 'Transactions');
        const q = query(transactionsRef, where('accountId', '==', accountId));
        const querySnapshot = await getDocs(q);

        const transactions = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                accountId: data.accountId,
                type: data.type,
                amount: data.amount,
                timestamp: data.timestamp.toDate(),
                description: data.description
            };
        });

        return transactions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }

    static async createTransfer(
        fromAccountId: string,
        toAccountId: string,
        amount: number,
        description: string
    ): Promise<void> {
        const fromAccountRef = doc(db, 'Accounts', fromAccountId);
        const toAccountRef = doc(db, 'Accounts', toAccountId);

        // Get both accounts
        const [fromAccountDoc, toAccountDoc] = await Promise.all([
            getDoc(fromAccountRef),
            getDoc(toAccountRef)
        ]);

        if (!fromAccountDoc.exists() || !toAccountDoc.exists()) {
            throw new Error('One or both accounts not found');
        }

        const fromAccountData = fromAccountDoc.data();
        const toAccountData = toAccountDoc.data();

        if (fromAccountData.balance < amount) {
            throw new Error('Insufficient funds');
        }

        // Create transfer record
        const transferData = {
            fromAccountId,
            toAccountId,
            amount,
            description,
            timestamp: serverTimestamp()
        };

        await addDoc(collection(db, 'Transfers'), transferData);

        // Update both account balances
        await Promise.all([
            updateDoc(fromAccountRef, {
                balance: fromAccountData.balance - amount
            }),
            updateDoc(toAccountRef, {
                balance: toAccountData.balance + amount
            })
        ]);

        // Create transaction records for both accounts
        await Promise.all([
            addDoc(collection(db, 'Transactions'), {
                accountId: fromAccountId,
                type: 'Withdrawal',
                amount,
                description: `Transfer to ${toAccountId}: ${description}`,
                timestamp: serverTimestamp()
            }),
            addDoc(collection(db, 'Transactions'), {
                accountId: toAccountId,
                type: 'Deposit',
                amount,
                description: `Transfer from ${fromAccountId}: ${description}`,
                timestamp: serverTimestamp()
            })
        ]);
    }

    static async getTransfers(accountId: string): Promise<Transfer[]> {
        const transfersRef = collection(db, 'Transfers');
        const q = query(
            transfersRef,
            where('fromAccountId', '==', accountId)
        );
        const querySnapshot = await getDocs(q);

        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                fromAccountId: data.fromAccountId,
                toAccountId: data.toAccountId,
                amount: data.amount,
                timestamp: data.timestamp.toDate()
            };
        });
    }

    static async createCustomerTransfer(
        fromAccountId: string,
        recipientEmail: string,
        amount: number,
        description: string
    ): Promise<void> {
        // Get the sender's account
        const fromAccountRef = doc(db, 'Accounts', fromAccountId);
        const fromAccountDoc = await getDoc(fromAccountRef);
        
        if (!fromAccountDoc.exists()) {
            throw new Error('Sender account not found');
        }

        const fromAccountData = fromAccountDoc.data();

        // Find recipient's customer record
        const customersRef = collection(db, 'Customers');
        const q = query(customersRef, where('email', '==', recipientEmail));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            throw new Error('Recipient not found');
        }

        const recipientCustomer = querySnapshot.docs[0];
        
        // Get recipient's account
        const recipientAccountsRef = collection(db, 'Accounts');
        const recipientQuery = query(recipientAccountsRef, where('customerId', '==', recipientCustomer.id));
        const recipientAccountsSnapshot = await getDocs(recipientQuery);

        if (recipientAccountsSnapshot.empty) {
            throw new Error('Recipient has no active accounts');
        }

        const recipientAccount = recipientAccountsSnapshot.docs[0];
        const recipientAccountData = recipientAccount.data();

        if (fromAccountData.balance < amount) {
            throw new Error('Insufficient funds');
        }

        // Create transfer record
        const transferData = {
            fromAccountId,
            toAccountId: recipientAccount.id,
            amount,
            description,
            timestamp: serverTimestamp(),
            recipientEmail
        };

        await addDoc(collection(db, 'Transfers'), transferData);

        // Update both account balances
        await Promise.all([
            updateDoc(fromAccountRef, {
                balance: fromAccountData.balance - amount
            }),
            updateDoc(doc(db, 'Accounts', recipientAccount.id), {
                balance: recipientAccountData.balance + amount
            })
        ]);

        // Create transaction records for both accounts
        await Promise.all([
            addDoc(collection(db, 'Transactions'), {
                accountId: fromAccountId,
                type: 'Withdrawal',
                amount,
                description: `Transfer to ${recipientEmail}: ${description}`,
                timestamp: serverTimestamp()
            }),
            addDoc(collection(db, 'Transactions'), {
                accountId: recipientAccount.id,
                type: 'Deposit',
                amount,
                description: `Transfer from ${fromAccountData.customerId}: ${description}`,
                timestamp: serverTimestamp()
            })
        ]);
    }

    static async createAccountTransfer(
        fromAccountId: string,
        toAccountId: string,
        amount: number,
        description: string
    ): Promise<void> {
        // Get both accounts
        const [fromAccountDoc, toAccountDoc] = await Promise.all([
            getDoc(doc(db, 'Accounts', fromAccountId)),
            getDoc(doc(db, 'Accounts', toAccountId))
        ]);

        if (!fromAccountDoc.exists() || !toAccountDoc.exists()) {
            throw new Error('One or both accounts not found');
        }

        const fromAccountData = fromAccountDoc.data();
        const toAccountData = toAccountDoc.data();

        if (fromAccountData.balance < amount) {
            throw new Error('Insufficient funds');
        }

        // Create transfer record
        const transferData = {
            fromAccountId,
            toAccountId,
            amount,
            description,
            timestamp: serverTimestamp()
        };

        await addDoc(collection(db, 'Transfers'), transferData);

        // Update both account balances
        await Promise.all([
            updateDoc(doc(db, 'Accounts', fromAccountId), {
                balance: fromAccountData.balance - amount
            }),
            updateDoc(doc(db, 'Accounts', toAccountId), {
                balance: toAccountData.balance + amount
            })
        ]);

        // Create transaction records for both accounts
        await Promise.all([
            addDoc(collection(db, 'Transactions'), {
                accountId: fromAccountId,
                type: 'Withdrawal',
                amount,
                description: `Transfer to Account ${toAccountId}: ${description}`,
                timestamp: serverTimestamp()
            }),
            addDoc(collection(db, 'Transactions'), {
                accountId: toAccountId,
                type: 'Deposit',
                amount,
                description: `Transfer from Account ${fromAccountId}: ${description}`,
                timestamp: serverTimestamp()
            })
        ]);
    }
} 