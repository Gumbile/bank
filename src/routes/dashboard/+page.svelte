<script lang="ts">
    import { onMount } from 'svelte';
    import { auth } from '$lib/services/firebase';
    import { CustomerModel } from '$lib/models/Customer';
    import { AccountModel } from '$lib/models/Account';
    import { goto } from '$app/navigation';
    import type { Customer } from '$lib/models/Customer';
    import type { Account, Transaction } from '$lib/models/Account';

    let customer: Customer | null = null;
    let accounts: Account[] = [];
    let selectedAccount: Account | null = null;
    let transactions: Transaction[] = [];
    let loading = true;
    let error = '';
    let amount = '';
    let description = '';
    let showTransactionModal = false;
    let showNewAccountModal = false;
    let showTransferModal = false;
    let transferAmount = '';
    let transferDescription = '';
    let selectedToAccount: Account | null = null;
    let showCustomerTransferModal = false;
    let recipientEmail = '';
    let customerTransferAmount = '';
    let customerTransferDescription = '';
    let showAccountTransferModal = false;
    let recipientAccountId = '';
    let accountTransferAmount = '';
    let accountTransferDescription = '';

    async function handleLogout() {
        try {
            loading = true;
            await auth.signOut();
            goto('/login');
        } catch (e) {
            if (e instanceof Error) {
                error = e.message;
            } else {
                error = 'An error occurred during logout';
            }
        } finally {
            loading = false;
        }
    }

    onMount(async () => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (!user) {
                goto('/login');
                return;
            }

            try {
                customer = await CustomerModel.getCustomerByEmail(user.email!);
                if (!customer) {
                    throw new Error('Customer not found');
                }
                
                accounts = await AccountModel.getCustomerAccounts(customer.id);
                if (accounts.length > 0) {
                    selectedAccount = accounts[0];
                    transactions = await AccountModel.getTransactions(selectedAccount.id);
                }
            } catch (e) {
                if (e instanceof Error) {
                    error = e.message;
                } else {
                    error = 'An error occurred while loading the dashboard';
                }
            } finally {
                loading = false;
            }
        });

        // Cleanup subscription on component destroy
        return () => unsubscribe();
    });

    async function handleAccountSelect(account: Account) {
        try {
            loading = true;
            selectedAccount = account;
            transactions = await AccountModel.getTransactions(account.id);
        } catch (e) {
            if (e instanceof Error) {
                alert(e.message);
            } else {
                alert('An error occurred while loading account details');
            }
        } finally {
            loading = false;
        }
    }

    async function handleCreateAccount() {
        if (!customer) return;

        try {
            loading = true;
            error = '';
            const newAccount = await AccountModel.createAccount(customer.id);
            accounts = [...accounts, newAccount];
            selectedAccount = newAccount;
            transactions = [];
            showNewAccountModal = false;
        } catch (e) {
            if (e instanceof Error) {
                alert(e.message);
            } else {
                alert('An error occurred while creating the account');
            }
        } finally {
            loading = false;
        }
    }

    async function handleTransaction(type: 'Deposit' | 'Withdrawal') {
        if (!amount || !description || !selectedAccount) {
            alert('Please fill in all fields');
            return;
        }

        try {
            loading = true;
            error = '';
            const numAmount = parseFloat(amount);
            
            if (isNaN(numAmount) || numAmount <= 0) {
                alert('Please enter a valid amount');
                return;
            }

            await AccountModel.createTransaction(
                selectedAccount.id,
                type,
                numAmount,
                description
            );

            // Refresh account and transactions
            const updatedAccount = await AccountModel.getAccount(selectedAccount.id);
            if (updatedAccount) {
                selectedAccount = updatedAccount;
                accounts = accounts.map(acc => 
                    acc.id === updatedAccount.id ? updatedAccount : acc
                );
                transactions = await AccountModel.getTransactions(selectedAccount.id);
            }
            
            // Reset form
            amount = '';
            description = '';
            showTransactionModal = false;
        } catch (e) {
            if (e instanceof Error) {
                alert(e.message);
            } else {
                alert('An error occurred while processing the transaction');
            }
        } finally {
            loading = false;
        }
    }

    async function handleTransfer() {
        if (!selectedAccount || !selectedToAccount || !transferAmount || !transferDescription) {
            alert('Please fill in all fields and select both accounts');
            return;
        }

        try {
            loading = true;
            error = '';
            const numAmount = parseFloat(transferAmount);
            
            if (isNaN(numAmount) || numAmount <= 0) {
                alert('Please enter a valid amount');
                return;
            }

            if (selectedAccount.id === selectedToAccount.id) {
                alert('Cannot transfer to the same account');
                return;
            }

            await AccountModel.createTransfer(
                selectedAccount.id,
                selectedToAccount.id,
                numAmount,
                transferDescription
            );

            // Refresh both accounts and transactions
            const updatedFromAccount = await AccountModel.getAccount(selectedAccount.id);
            const updatedToAccount = await AccountModel.getAccount(selectedToAccount.id);
            
            if (updatedFromAccount && updatedToAccount) {
                selectedAccount = updatedFromAccount;
                accounts = accounts.map(acc => {
                    if (acc.id === updatedFromAccount.id) return updatedFromAccount;
                    if (acc.id === updatedToAccount.id) return updatedToAccount;
                    return acc;
                });
                transactions = await AccountModel.getTransactions(selectedAccount.id);
            }
            
            // Reset form
            transferAmount = '';
            transferDescription = '';
            selectedToAccount = null;
            showTransferModal = false;
        } catch (e) {
            if (e instanceof Error) {
                alert(e.message);
            } else {
                alert('An error occurred while processing the transfer');
            }
        } finally {
            loading = false;
        }
    }

    async function handleCustomerTransfer() {
        if (!selectedAccount || !recipientEmail || !customerTransferAmount || !customerTransferDescription) {
            alert('Please fill in all fields');
            return;
        }

        try {
            loading = true;
            error = '';
            const numAmount = parseFloat(customerTransferAmount);
            
            if (isNaN(numAmount) || numAmount <= 0) {
                alert('Please enter a valid amount');
                return;
            }

            await AccountModel.createCustomerTransfer(
                selectedAccount.id,
                recipientEmail,
                numAmount,
                customerTransferDescription
            );

            // Refresh account and transactions
            const updatedAccount = await AccountModel.getAccount(selectedAccount.id);
            if (updatedAccount) {
                selectedAccount = updatedAccount;
                accounts = accounts.map(acc => 
                    acc.id === updatedAccount.id ? updatedAccount : acc
                );
                transactions = await AccountModel.getTransactions(selectedAccount.id);
            }
            
            // Reset form
            recipientEmail = '';
            customerTransferAmount = '';
            customerTransferDescription = '';
            showCustomerTransferModal = false;
        } catch (e) {
            if (e instanceof Error) {
                alert(e.message);
            } else {
                alert('An error occurred while processing the transfer');
            }
        } finally {
            loading = false;
        }
    }

    async function handleAccountTransfer() {
        if (!selectedAccount || !recipientAccountId || !accountTransferAmount || !accountTransferDescription) {
            alert('Please fill in all fields');
            return;
        }

        try {
            loading = true;
            error = '';
            const numAmount = parseFloat(accountTransferAmount);
            
            if (isNaN(numAmount) || numAmount <= 0) {
                alert('Please enter a valid amount');
                return;
            }

            if (selectedAccount.id === recipientAccountId) {
                alert('Cannot transfer to the same account');
                return;
            }

            await AccountModel.createAccountTransfer(
                selectedAccount.id,
                recipientAccountId,
                numAmount,
                accountTransferDescription
            );

            // Refresh account and transactions
            const updatedAccount = await AccountModel.getAccount(selectedAccount.id);
            if (updatedAccount) {
                selectedAccount = updatedAccount;
                accounts = accounts.map(acc => 
                    acc.id === updatedAccount.id ? updatedAccount : acc
                );
                transactions = await AccountModel.getTransactions(selectedAccount.id);
            }
            
            // Reset form
            recipientAccountId = '';
            accountTransferAmount = '';
            accountTransferDescription = '';
            showAccountTransferModal = false;
        } catch (e) {
            if (e instanceof Error) {
                alert(e.message);
            } else {
                alert('An error occurred while processing the transfer');
            }
        } finally {
            loading = false;
        }
    }

    function formatDate(date: Date) {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    function formatAmount(amount: number) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }
</script>

<div class="dashboard">
    <nav class="dashboard-nav">
        <div class="nav-brand">BankPro</div>
        <div class="nav-user">
            <span>Welcome, {customer?.firstName} {customer?.lastName}</span>
            <button 
                class="btn-logout" 
                on:click={handleLogout}
                disabled={loading}
            >
                {loading ? 'Logging out...' : 'Logout'}
            </button>
        </div>
    </nav>

    <main class="dashboard-content">
        {#if loading}
            <div class="loading">Loading...</div>
        {:else if error}
            <div class="error-message">{error}</div>
        {:else}
            <div class="dashboard-grid">
                <!-- Account Selection -->
                <div class="card account-selection">
                    <h2>Your Accounts</h2>
                    {#if accounts.length === 0}
                        <p class="no-accounts">No accounts yet</p>
                        <button 
                            class="btn-primary"
                            on:click={() => showNewAccountModal = true}
                        >
                            Open New Account
                        </button>
                    {:else}
                        <div class="account-list">
                            {#each accounts as account}
                                <button
                                    class="account-item {selectedAccount?.id === account.id ? 'selected' : ''}"
                                    on:click={() => handleAccountSelect(account)}
                                >
                                    <div class="account-info">
                                        <span class="account-balance">{formatAmount(account.balance)}</span>
                                        <span class="account-status">{account.status}</span>
                                    </div>
                                </button>
                            {/each}
                            <button 
                                class="btn-secondary"
                                on:click={() => showNewAccountModal = true}
                            >
                                Open New Account
                            </button>
                        </div>
                    {/if}
                </div>

                {#if selectedAccount}
                    <!-- Account Overview -->
                    <div class="card account-overview">
                        <h2>Account Overview</h2>
                        <div class="balance">
                            <span class="label">Current Balance</span>
                            <span class="amount">{formatAmount(selectedAccount.balance)}</span>
                        </div>
                        <div class="quick-actions">
                            <button 
                                class="btn-primary"
                                on:click={() => showTransactionModal = true}
                            >
                                New Transaction
                            </button>
                            <button 
                                class="btn-secondary"
                                on:click={() => showTransferModal = true}
                            >
                                Transfer Between My Accounts
                            </button>
                            <button 
                                class="btn-secondary"
                                on:click={() => showAccountTransferModal = true}
                            >
                                Send to Another Account
                            </button>
                        </div>
                    </div>

                    <!-- Recent Transactions -->
                    <div class="card transactions">
                        <h2>Recent Transactions</h2>
                        {#if transactions.length === 0}
                            <p class="no-transactions">No transactions yet</p>
                        {:else}
                            <div class="transaction-list">
                                {#each transactions as transaction}
                                    <div class="transaction-item">
                                        <div class="transaction-info">
                                            <span class="transaction-type {transaction.type.toLowerCase()}">
                                                {transaction.type}
                                            </span>
                                            <span class="transaction-description">
                                                {transaction.description}
                                            </span>
                                        </div>
                                        <div class="transaction-details">
                                            <span class="transaction-amount {transaction.type.toLowerCase()}">
                                                {transaction.type === 'Deposit' ? '+' : '-'}
                                                {formatAmount(transaction.amount)}
                                            </span>
                                            <span class="transaction-date">
                                                {formatDate(transaction.timestamp)}
                                            </span>
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        {/if}
                    </div>
                {/if}
            </div>
        {/if}
    </main>

    <!-- Transaction Modal -->
    {#if showTransactionModal}
        <div class="modal-backdrop" on:click={() => showTransactionModal = false}>
            <div class="modal-content" on:click|stopPropagation>
                <h2>New Transaction</h2>
                <form on:submit|preventDefault class="transaction-form">
                    <div class="form-group">
                        <label for="amount">Amount</label>
                        <input
                            type="number"
                            id="amount"
                            bind:value={amount}
                            placeholder="Enter amount"
                            step="0.01"
                            min="0"
                            required
                        />
                    </div>

                    <div class="form-group">
                        <label for="description">Description</label>
                        <input
                            type="text"
                            id="description"
                            bind:value={description}
                            placeholder="Enter description"
                            required
                        />
                    </div>

                    <div class="transaction-actions">
                        <button
                            type="button"
                            class="btn-secondary"
                            on:click={() => showTransactionModal = false}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            class="btn-primary"
                            on:click={() => handleTransaction('Deposit')}
                            disabled={loading}
                        >
                            Deposit
                        </button>
                        <button
                            type="submit"
                            class="btn-danger"
                            on:click={() => handleTransaction('Withdrawal')}
                            disabled={loading}
                        >
                            Withdraw
                        </button>
                    </div>
                </form>
            </div>
        </div>
    {/if}

    <!-- New Account Modal -->
    {#if showNewAccountModal}
        <div class="modal-backdrop" on:click={() => showNewAccountModal = false}>
            <div class="modal-content" on:click|stopPropagation>
                <h2>Open New Account</h2>
                <form on:submit|preventDefault class="account-form">
                    <p class="account-info-text">
                        A new account will be created with an initial balance of $0.00
                    </p>
                    <div class="transaction-actions">
                        <button
                            type="button"
                            class="btn-secondary"
                            on:click={() => showNewAccountModal = false}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            class="btn-primary"
                            on:click={handleCreateAccount}
                            disabled={loading}
                        >
                            Create Account
                        </button>
                    </div>
                </form>
            </div>
        </div>
    {/if}

    <!-- Transfer Modal -->
    {#if showTransferModal}
        <div class="modal-backdrop" on:click={() => showTransferModal = false}>
            <div class="modal-content" on:click|stopPropagation>
                <h2>Transfer Money</h2>
                <form on:submit|preventDefault class="transfer-form">
                    <div class="form-group">
                        <label for="fromAccount">From Account</label>
                        <div class="account-select">
                            {selectedAccount ? formatAmount(selectedAccount.balance) : 'No account selected'}
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="toAccount">To Account</label>
                        <select
                            id="toAccount"
                            bind:value={selectedToAccount}
                            required
                        >
                            <option value={null}>Select an account</option>
                            {#each accounts.filter(acc => acc.id !== selectedAccount?.id) as account}
                                <option value={account}>
                                    {formatAmount(account.balance)}
                                </option>
                            {/each}
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="transferAmount">Amount</label>
                        <input
                            type="number"
                            id="transferAmount"
                            bind:value={transferAmount}
                            placeholder="Enter amount"
                            step="0.01"
                            min="0"
                            required
                        />
                    </div>

                    <div class="form-group">
                        <label for="transferDescription">Description</label>
                        <input
                            type="text"
                            id="transferDescription"
                            bind:value={transferDescription}
                            placeholder="Enter description"
                            required
                        />
                    </div>

                    <div class="transaction-actions">
                        <button
                            type="button"
                            class="btn-secondary"
                            on:click={() => showTransferModal = false}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            class="btn-primary"
                            on:click={handleTransfer}
                            disabled={loading}
                        >
                            Transfer
                        </button>
                    </div>
                </form>
            </div>
        </div>
    {/if}

    <!-- Customer Transfer Modal -->
    {#if showCustomerTransferModal}
        <div class="modal-backdrop" on:click={() => showCustomerTransferModal = false}>
            <div class="modal-content" on:click|stopPropagation>
                <h2>Send Money</h2>
                <form on:submit|preventDefault class="transfer-form">
                    <div class="form-group">
                        <label for="fromAccount">From Account</label>
                        <div class="account-select">
                            {selectedAccount ? formatAmount(selectedAccount.balance) : 'No account selected'}
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="recipientEmail">Recipient Email</label>
                        <input
                            type="email"
                            id="recipientEmail"
                            bind:value={recipientEmail}
                            placeholder="Enter recipient's email"
                            required
                        />
                    </div>

                    <div class="form-group">
                        <label for="customerTransferAmount">Amount</label>
                        <input
                            type="number"
                            id="customerTransferAmount"
                            bind:value={customerTransferAmount}
                            placeholder="Enter amount"
                            step="0.01"
                            min="0"
                            required
                        />
                    </div>

                    <div class="form-group">
                        <label for="customerTransferDescription">Description</label>
                        <input
                            type="text"
                            id="customerTransferDescription"
                            bind:value={customerTransferDescription}
                            placeholder="Enter description"
                            required
                        />
                    </div>

                    <div class="transaction-actions">
                        <button
                            type="button"
                            class="btn-secondary"
                            on:click={() => showCustomerTransferModal = false}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            class="btn-primary"
                            on:click={handleCustomerTransfer}
                            disabled={loading}
                        >
                            Send Money
                        </button>
                    </div>
                </form>
            </div>
        </div>
    {/if}

    <!-- Account Transfer Modal -->
    {#if showAccountTransferModal}
        <div class="modal-backdrop" on:click={() => showAccountTransferModal = false}>
            <div class="modal-content" on:click|stopPropagation>
                <h2>Send to Another Account</h2>
                <form on:submit|preventDefault class="transfer-form">
                    <div class="form-group">
                        <label for="fromAccount">From Account</label>
                        <div class="account-select">
                            {selectedAccount ? formatAmount(selectedAccount.balance) : 'No account selected'}
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="recipientAccountId">Recipient Account ID</label>
                        <input
                            type="text"
                            id="recipientAccountId"
                            bind:value={recipientAccountId}
                            placeholder="Enter recipient's account ID"
                            required
                        />
                    </div>

                    <div class="form-group">
                        <label for="accountTransferAmount">Amount</label>
                        <input
                            type="number"
                            id="accountTransferAmount"
                            bind:value={accountTransferAmount}
                            placeholder="Enter amount"
                            step="0.01"
                            min="0"
                            required
                        />
                    </div>

                    <div class="form-group">
                        <label for="accountTransferDescription">Description</label>
                        <input
                            type="text"
                            id="accountTransferDescription"
                            bind:value={accountTransferDescription}
                            placeholder="Enter description"
                            required
                        />
                    </div>

                    <div class="transaction-actions">
                        <button
                            type="button"
                            class="btn-secondary"
                            on:click={() => showAccountTransferModal = false}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            class="btn-primary"
                            on:click={handleAccountTransfer}
                            disabled={loading}
                        >
                            Send Money
                        </button>
                    </div>
                </form>
            </div>
        </div>
    {/if}
</div>

<style>
    .dashboard {
        min-height: 100vh;
        background: #f8fafc;
    }

    .dashboard-nav {
        background: white;
        padding: 1rem 2rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .nav-brand {
        font-size: 1.5rem;
        font-weight: bold;
        color: #2563eb;
    }

    .nav-user {
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .btn-logout {
        background: none;
        border: none;
        color: #64748b;
        cursor: pointer;
        font-weight: 500;
    }

    .dashboard-content {
        padding: 2rem;
        max-width: 1200px;
        margin: 0 auto;
    }

    .dashboard-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 2rem;
    }

    .card {
        background: white;
        border-radius: 0.5rem;
        padding: 1.5rem;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .card h2 {
        color: #1e293b;
        font-size: 1.25rem;
        margin-bottom: 1rem;
    }

    .balance {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-bottom: 1.5rem;
    }

    .balance .label {
        color: #64748b;
        font-size: 0.875rem;
    }

    .balance .amount {
        color: #1e293b;
        font-size: 2rem;
        font-weight: bold;
    }

    .quick-actions {
        display: flex;
        gap: 1rem;
    }

    .btn-primary {
        background: #2563eb;
        color: white;
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 0.375rem;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s;
    }

    .btn-primary:hover {
        background: #1d4ed8;
    }

    .btn-secondary {
        background: #e2e8f0;
        color: #1e293b;
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 0.375rem;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s;
    }

    .btn-secondary:hover {
        background: #cbd5e1;
    }

    .btn-danger {
        background: #dc2626;
        color: white;
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 0.375rem;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s;
    }

    .btn-danger:hover {
        background: #b91c1c;
    }

    .transactions {
        max-height: 300px;
        display: flex;
        flex-direction: column;
    }

    .transaction-list {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        overflow-y: auto;
        padding-right: 0.5rem;
        margin-right: -0.5rem;
    }

    .transaction-list::-webkit-scrollbar {
        width: 6px;
    }

    .transaction-list::-webkit-scrollbar-track {
        background: #f1f5f9;
        border-radius: 3px;
    }

    .transaction-list::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 3px;
    }

    .transaction-list::-webkit-scrollbar-thumb:hover {
        background: #94a3b8;
    }

    .transaction-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        background: #f8fafc;
        border-radius: 0.375rem;
    }

    .transaction-info {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    .transaction-type {
        font-size: 0.875rem;
        font-weight: 500;
        text-transform: capitalize;
    }

    .transaction-type.deposit {
        color: #059669;
    }

    .transaction-type.withdrawal {
        color: #dc2626;
    }

    .transaction-description {
        color: #64748b;
        font-size: 0.875rem;
    }

    .transaction-details {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0.25rem;
    }

    .transaction-amount {
        font-weight: 500;
    }

    .transaction-amount.deposit {
        color: #059669;
    }

    .transaction-amount.withdrawal {
        color: #dc2626;
    }

    .transaction-date {
        color: #64748b;
        font-size: 0.875rem;
    }

    .no-transactions {
        color: #64748b;
        text-align: center;
        padding: 2rem;
    }

    .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    }

    .modal-content {
        background: white;
        padding: 2rem;
        border-radius: 0.5rem;
        width: 100%;
        max-width: 400px;
    }

    .transaction-form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .form-group label {
        color: #4b5563;
        font-weight: 500;
    }

    .form-group input {
        padding: 0.75rem;
        border: 1px solid #e2e8f0;
        border-radius: 0.375rem;
        font-size: 1rem;
    }

    .transaction-actions {
        display: flex;
        gap: 1rem;
        margin-top: 1rem;
    }

    .loading {
        text-align: center;
        padding: 2rem;
        color: #64748b;
    }

    .error-message {
        background: #fee2e2;
        color: #dc2626;
        padding: 1rem;
        border-radius: 0.375rem;
        margin-bottom: 1rem;
    }

    .account-selection {
        grid-column: 1 / -1;
    }

    .account-list {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .account-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 0.375rem;
        cursor: pointer;
        transition: all 0.2s;
        width: 100%;
    }

    .account-item:hover {
        background: #f1f5f9;
    }

    .account-item.selected {
        background: #e0f2fe;
        border-color: #0ea5e9;
    }

    .account-info {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    .account-balance {
        font-size: 1.25rem;
        font-weight: bold;
        color: #0f172a;
    }

    .account-status {
        font-size: 0.875rem;
        color: #64748b;
    }

    .no-accounts {
        text-align: center;
        color: #64748b;
        margin-bottom: 1rem;
    }

    .account-info-text {
        color: #64748b;
        margin-bottom: 1.5rem;
        text-align: center;
    }

    .account-select {
        padding: 0.75rem;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 0.375rem;
        font-size: 1rem;
        color: #1e293b;
    }

    .transfer-form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .transfer-form select {
        padding: 0.75rem;
        border: 1px solid #e2e8f0;
        border-radius: 0.375rem;
        font-size: 1rem;
        background: white;
        color: #1e293b;
    }

    .transfer-form select:focus {
        outline: none;
        border-color: #2563eb;
        box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
    }

    @media (max-width: 640px) {
        .dashboard-content {
            padding: 1rem;
        }

        .dashboard-grid {
            grid-template-columns: 1fr;
        }

        .transaction-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
        }

        .transaction-details {
            align-items: flex-start;
        }

        .account-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
        }

        .account-status {
            align-self: flex-start;
        }
    }
</style> 