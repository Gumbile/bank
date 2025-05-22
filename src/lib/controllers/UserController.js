import { db } from '../services/firebase';
import { collection, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { User } from '../models/User';

export class UserController {
    static async getUser(userId) {
        try {
            const userDoc = await getDoc(doc(db, 'users', userId));
            if (userDoc.exists()) {
                return User.fromFirestore(userDoc);
            }
            return null;
        } catch (error) {
            console.error('Error getting user:', error);
            throw error;
        }
    }

    static async createUser(userId, userData) {
        try {
            const user = new User(userId, userData.email, userData.name);
            await setDoc(doc(db, 'users', userId), user.toFirestore());
            return user;
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }

    static async updateBalance(userId, amount) {
        try {
            const userRef = doc(db, 'users', userId);
            const userDoc = await getDoc(userRef);
            
            if (!userDoc.exists()) {
                throw new Error('User not found');
            }

            const currentBalance = userDoc.data().balance;
            const newBalance = currentBalance + amount;

            await updateDoc(userRef, { balance: newBalance });
            return newBalance;
        } catch (error) {
            console.error('Error updating balance:', error);
            throw error;
        }
    }
} 