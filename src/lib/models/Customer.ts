import { db } from '$lib/services/firebase';
import { collection, doc, getDoc, setDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';

export interface Customer {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    dob: string;
    createdAt: Date;
}

export class CustomerModel {
    static async createCustomer(
        id: string,
        data: {
            firstName: string;
            lastName: string;
            email: string;
            phoneNumber: string;
            dob: string;
        }
    ): Promise<Customer> {
        try {
            console.log('Starting customer creation process...');
            const customerData = {
                firstName: data.firstName,
                lastName: data.lastName,
                email: data.email,
                phoneNumber: data.phoneNumber,
                dob: data.dob,
                createdAt: serverTimestamp()
            };

            console.log('Creating customer document...');
            await setDoc(doc(db, 'Customers', id), customerData);
            console.log('Customer document created successfully');

            // Create initial account for the customer
            console.log('Creating initial account...');
            const accountData = {
                customerId: id,
                balance: 0,
                status: 'Active',
                createdAt: serverTimestamp()
            };

            // Create account in the Accounts collection
            await setDoc(doc(db, 'Accounts', id), accountData);
            console.log('Account created successfully');

            return {
                id,
                ...data,
                createdAt: new Date()
            };
        } catch (error: any) {
            console.error('Error in createCustomer:', error);
            throw new Error(`Failed to create customer: ${error.message}`);
        }
    }

    static async getCustomer(id: string): Promise<Customer | null> {
        const customerDoc = await getDoc(doc(db, 'Customers', id));
        if (!customerDoc.exists()) {
            return null;
        }

        const data = customerDoc.data();
        return {
            id: customerDoc.id,
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            phoneNumber: data.phoneNumber,
            dob: data.dob,
            createdAt: data.createdAt.toDate()
        };
    }

    static async getCustomerByEmail(email: string): Promise<Customer | null> {
        const customersRef = collection(db, 'Customers');
        const q = query(customersRef, where('email', '==', email));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return null;
        }

        const doc = querySnapshot.docs[0];
        const data = doc.data();
        return {
            id: doc.id,
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            phoneNumber: data.phoneNumber,
            dob: data.dob,
            createdAt: data.createdAt.toDate()
        };
    }
} 