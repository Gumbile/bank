export class User {
    constructor(id, email, name, balance = 0) {
        this.id = id;
        this.email = email;
        this.name = name;
        this.balance = balance;
    }

    static fromFirestore(doc) {
        const data = doc.data();
        return new User(
            doc.id,
            data.email,
            data.name,
            data.balance
        );
    }

    toFirestore() {
        return {
            email: this.email,
            name: this.name,
            balance: this.balance
        };
    }
} 