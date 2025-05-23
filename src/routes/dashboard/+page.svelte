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
    let activeTab: 'accounts' | 'balance' | 'transactions' = 'accounts';
    let copiedId: string | null = null;
    let isDarkMode = false;

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

    function switchTab(tab: 'accounts' | 'balance' | 'transactions') {
        activeTab = tab;
    }

    async function copyAccountId(id: string) {
        try {
            await navigator.clipboard.writeText(id);
            copiedId = id;
            setTimeout(() => {
                copiedId = null;
            }, 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    }

    function toggleDarkMode() {
        isDarkMode = !isDarkMode;
        document.documentElement.classList.toggle('dark-mode');
    }
</script>

<div class="dashboard" class:dark-mode={isDarkMode}>
    <nav class="dashboard-nav">
        <div class="nav-brand">BankPro</div>
        <div class="nav-user">
            <span>Welcome, {customer?.firstName} {customer?.lastName}</span>
            <button 
                class="btn-theme"
                on:click={toggleDarkMode}
                title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
                {isDarkMode ? '☀️' : '🌙'}
            </button>
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
            <div class="tabs">
                <button 
                    class="tab-btn {activeTab === 'accounts' ? 'active' : ''}"
                    on:click={() => switchTab('accounts')}
                >
                    Accounts
                </button>
                <button 
                    class="tab-btn {activeTab === 'balance' ? 'active' : ''}"
                    on:click={() => switchTab('balance')}
                    disabled={!selectedAccount}
                >
                    Balance
                </button>
                <button 
                    class="tab-btn {activeTab === 'transactions' ? 'active' : ''}"
                    on:click={() => switchTab('transactions')}
                    disabled={!selectedAccount}
                >
                    Transactions
                </button>
            </div>

            <div class="tab-content">
                {#if activeTab === 'accounts'}
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
                                    <div
                                        class="account-item {selectedAccount?.id === account.id ? 'selected' : ''}"
                                        on:click={() => handleAccountSelect(account)}
                                    >
                                        <div class="account-info">
                                            <div class="account-header">
                                                <span class="account-balance">{formatAmount(account.balance)}</span>
                                                <span class="account-status">{account.status}</span>
                                            </div>
                                            <div class="account-id">
                                                <span class="id-label">Account ID:</span>
                                                <span class="id-value">{account.id}</span>
                                                <button 
                                                    class="btn-copy"
                                                    on:click|stopPropagation={() => copyAccountId(account.id)}
                                                    title="Copy Account ID"
                                                >
                                                    {#if copiedId === account.id}
                                                        <span class="copy-icon">✓</span>
                                                    {:else}
                                                        <span class="copy-icon">📋</span>
                                                    {/if}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
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
                {:else if activeTab === 'balance' && selectedAccount}
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
                {:else if activeTab === 'transactions' && selectedAccount}
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
                <div class="modal-header">
                    <h2>New Transaction</h2>
                    <button 
                        class="btn-close"
                        on:click={() => showTransactionModal = false}
                    >
                        ×
                    </button>
                </div>
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
                <div class="modal-header">
                    <h2>Transfer Money</h2>
                    <button 
                        class="btn-close"
                        on:click={() => showTransferModal = false}
                    >
                        ×
                    </button>
                </div>
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
                <div class="modal-header">
                    <h2>Send to Another Account</h2>
                    <button 
                        class="btn-close"
                        on:click={() => showAccountTransferModal = false}
                    >
                        ×
                    </button>
                </div>
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
    :root {
        --bg-primary: #f0f9ff;
        --bg-secondary: #ffffff;
        --text-primary: #1e293b;
        --text-secondary: #64748b;
        --border-color: #e2e8f0;
        --card-bg: #ffffff;
        --hover-bg: #f1f5f9;
        --shadow-color: rgba(0, 0, 0, 0.1);
    }

    :root.dark-mode {
        --bg-primary: #0f172a;
        --bg-secondary: #1e293b;
        --text-primary: #f8fafc;
        --text-secondary: #cbd5e1;
        --border-color: #334155;
        --card-bg: #1e293b;
        --hover-bg: #334155;
        --shadow-color: rgba(0, 0, 0, 0.3);
    }

    .dashboard {
        min-height: 100vh;
        background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
        color: var(--text-primary);
    }

    .dashboard-nav {
        background: var(--card-bg);
        backdrop-filter: blur(10px);
        padding: 1rem 2rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        position: sticky;
        top: 0;
        z-index: 100;
        border-bottom: 1px solid var(--border-color);
    }

    .nav-brand {
        font-size: 1.75rem;
        font-weight: bold;
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .nav-user {
        display: flex;
        align-items: center;
        gap: 1.5rem;
    }

    .nav-user span {
        color: var(--text-primary);
    }

    .btn-theme {
        background: none;
        border: none;
        font-size: 1.25rem;
        cursor: pointer;
        padding: 0.5rem;
        border-radius: 0.5rem;
        transition: all 0.3s ease;
        color: var(--text-primary);
    }

    .btn-theme:hover {
        background: var(--hover-bg);
    }

    .btn-logout {
        background: none;
        border: 2px solid var(--border-color);
        color: var(--text-secondary);
        cursor: pointer;
        font-weight: 500;
        padding: 0.5rem 1rem;
        border-radius: 1rem;
        transition: all 0.3s ease;
    }

    .btn-logout:hover {
        background: var(--hover-bg);
        border-color: var(--text-secondary);
        transform: translateY(-1px);
    }

    .dashboard-content {
        padding: 2rem;
        max-width: 1000px;
        margin: 0 auto;
    }

    .tabs {
        display: flex;
        gap: 1rem;
        margin-bottom: 2rem;
        background: white;
        padding: 0.5rem;
        border-radius: 1rem;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }

    .tab-btn {
        padding: 0.75rem 1.5rem;
        border: none;
        background: none;
        color: #64748b;
        font-weight: 600;
        cursor: pointer;
        border-radius: 0.75rem;
        transition: all 0.3s ease;
        font-size: 0.875rem;
        position: relative;
        overflow: hidden;
    }

    .tab-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .tab-btn:hover:not(:disabled) {
        background: #f8fafc;
        color: #1e293b;
        transform: translateY(-1px);
    }

    .tab-btn.active {
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        color: white;
        box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);
    }

    .card {
        background: var(--card-bg);
        border-radius: 1rem;
        padding: 1.5rem;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        transition: transform 0.3s ease;
        border: 1px solid var(--border-color);
        color: var(--text-primary);
    }

    .card:hover {
        transform: translateY(-2px);
    }

    .card h2 {
        color: var(--text-primary);
        font-size: 1.5rem;
        margin-bottom: 1.5rem;
        font-weight: 600;
        background: none;
        -webkit-text-fill-color: var(--text-primary);
    }

    .balance {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-bottom: 2rem;
        padding: 1.5rem;
        background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
        border-radius: 1rem;
    }

    .balance .label {
        color: #64748b;
        font-size: 1rem;
        font-weight: 500;
    }

    .balance .amount {
        color: #1e293b;
        font-size: 2.5rem;
        font-weight: bold;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .quick-actions {
        display: flex;
        gap: 1rem;
    }

    .btn-primary {
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        color: white;
        padding: 0.75rem 1.5rem;
        border: none;
        border-radius: 0.75rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);
    }

    .btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 8px -1px rgba(37, 99, 235, 0.3);
    }

    .btn-secondary {
        background: white;
        color: #1e293b;
        padding: 0.75rem 1.5rem;
        border: 2px solid #e2e8f0;
        border-radius: 0.75rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
    }

    .btn-secondary:hover {
        background: #f8fafc;
        border-color: #cbd5e1;
        transform: translateY(-2px);
    }

    .btn-danger {
        background: #dc2626;
        color: white;
        padding: 0.75rem 1.5rem;
        border: none;
        border-radius: 0.75rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
    }

    .btn-danger:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }

    .transactions {
        max-height: 600px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }

    .transaction-list {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        overflow-y: auto;
        padding-right: 0.5rem;
        margin-right: -0.5rem;
        max-height: 550px;
    }

    .transaction-list::-webkit-scrollbar {
        width: 8px;
    }

    .transaction-list::-webkit-scrollbar-track {
        background: var(--hover-bg);
        border-radius: 4px;
    }

    .transaction-list::-webkit-scrollbar-thumb {
        background: var(--border-color);
        border-radius: 4px;
        border: 2px solid var(--hover-bg);
    }

    .transaction-list::-webkit-scrollbar-thumb:hover {
        background: var(--text-secondary);
    }

    .transaction-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.25rem;
        background: var(--card-bg);
        border-radius: 1rem;
        transition: all 0.3s ease;
        border: 1px solid var(--border-color);
        color: var(--text-primary);
    }

    .transaction-item:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
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
        font-weight: 600;
    }

    .transaction-type.withdrawal {
        color: #dc2626;
        font-weight: 600;
    }

    .transaction-description {
        color: var(--text-secondary);
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
        font-weight: 600;
    }

    .transaction-amount.withdrawal {
        color: #dc2626;
        font-weight: 600;
    }

    .transaction-date {
        color: var(--text-secondary);
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
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        animation: fadeIn 0.3s ease-out;
    }

    .modal-content {
        background: var(--card-bg);
        padding: 2rem;
        border-radius: 1rem;
        width: 100%;
        max-width: 500px;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        animation: modalSlideIn 0.3s ease-out;
        position: relative;
        border: 1px solid var(--border-color);
        color: var(--text-primary);
    }

    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
        padding-bottom: 1rem;
        border-bottom: 2px solid #e2e8f0;
    }

    .modal-header h2 {
        margin: 0;
        font-size: 1.5rem;
        background: none;
        -webkit-text-fill-color: var(--text-primary);
    }

    .btn-close {
        background: none;
        border: none;
        font-size: 1.5rem;
        color: #64748b;
        cursor: pointer;
        padding: 0.5rem;
        line-height: 1;
        border-radius: 0.5rem;
        transition: all 0.2s;
    }

    .btn-close:hover {
        background: #f1f5f9;
        color: #1e293b;
    }

    .transaction-form,
    .transfer-form {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
    }

    .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .form-group label {
        color: var(--text-secondary);
        font-weight: 500;
        font-size: 0.875rem;
    }

    .form-group input,
    .form-group select {
        padding: 0.75rem 1rem;
        border: 2px solid var(--border-color);
        border-radius: 0.75rem;
        font-size: 1rem;
        transition: all 0.3s ease;
        background: var(--card-bg);
        color: var(--text-primary);
    }

    .form-group input:focus,
    .form-group select:focus {
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        outline: none;
    }

    .transaction-actions {
        display: flex;
        gap: 1rem;
        margin-top: 1rem;
        flex-wrap: wrap;
    }

    .transaction-actions button {
        flex: 1;
        min-width: 120px;
    }

    .account-select {
        padding: 0.75rem 1rem;
        background: #f8fafc;
        border: 2px solid #e2e8f0;
        border-radius: 0.75rem;
        font-size: 1rem;
        color: #1e293b;
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }

    @keyframes modalSlideIn {
        from {
            opacity: 0;
            transform: translateY(-20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
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
        align-items: flex-start;
        padding: 1.5rem;
        background: var(--card-bg);
        border: 2px solid var(--border-color);
        border-radius: 1.25rem;
        cursor: pointer;
        transition: all 0.3s ease;
        width: 100%;
        position: relative;
        overflow: hidden;
        color: var(--text-primary);
    }

    .account-item::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: linear-gradient(90deg, #3b82f6, #2563eb);
        opacity: 0;
        transition: opacity 0.3s ease;
    }

    .account-item:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 20px -8px rgba(0, 0, 0, 0.1);
        border-color: var(--text-secondary);
    }

    .account-item:hover::before {
        opacity: 1;
    }

    .account-item.selected {
        background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
        border-color: #0ea5e9;
        box-shadow: 0 8px 16px -4px rgba(14, 165, 233, 0.2);
    }

    .account-item.selected::before {
        opacity: 1;
        background: linear-gradient(90deg, #0ea5e9, #0284c7);
    }

    .account-info {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        width: 100%;
    }

    .account-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .account-balance {
        font-size: 1.5rem;
        font-weight: bold;
        background: none;
        -webkit-text-fill-color: var(--text-primary);
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        color: var(--text-primary);
    }

    .account-status {
        font-size: 0.875rem;
        color: var(--text-secondary);
        padding: 0.375rem 1rem;
        background: var(--hover-bg);
        border-radius: 1.5rem;
        font-weight: 500;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        transition: all 0.3s ease;
    }

    .account-item:hover .account-status {
        background: var(--text-secondary);
        color: var(--text-primary);
    }

    .account-item.selected .account-status {
        background: rgba(255, 255, 255, 0.9);
        color: #0ea5e9;
    }

    .account-id {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        font-size: 0.875rem;
        color: var(--text-secondary);
        background: var(--hover-bg);
        padding: 0.75rem 1rem;
        border-radius: 0.75rem;
        border: 1px solid var(--border-color);
        transition: all 0.3s ease;
    }

    .account-item:hover .account-id {
        background: var(--text-primary);
        border-color: var(--text-secondary);
    }

    .id-label {
        font-weight: 600;
        color: var(--text-secondary);
    }

    .id-value {
        font-family: 'Courier New', monospace;
        color: var(--text-primary);
        letter-spacing: 0.5px;
        padding: 0.125rem 0.375rem;
        background: var(--card-bg);
        border-radius: 0.375rem;
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

    .btn-copy {
        background: none;
        border: none;
        padding: 0.375rem;
        cursor: pointer;
        border-radius: 0.5rem;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--text-secondary);
        min-width: 36px;
        height: 36px;
    }

    .btn-copy:hover {
        background: var(--hover-bg);
        color: var(--text-primary);
        transform: scale(1.1);
    }

    .copy-icon {
        font-size: 1.125rem;
        line-height: 1;
    }

    .account-item.selected .btn-copy {
        color: #0ea5e9;
    }

    .account-item.selected .btn-copy:hover {
        background: rgba(14, 165, 233, 0.1);
    }

    .account-list .btn-secondary {
        background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
        color: white;
        border: none;
        box-shadow: 0 4px 6px -1px rgba(14, 165, 233, 0.2);
    }

    .account-list .btn-secondary:hover {
        background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
        border-color: transparent;
        box-shadow: 0 6px 8px -1px rgba(14, 165, 233, 0.3);
    }

    @media (max-width: 640px) {
        .tabs {
            flex-direction: column;
            gap: 0.5rem;
            padding: 1rem;
        }

        .tab-btn {
            width: 100%;
            text-align: center;
            padding: 1rem;
        }

        .dashboard-content {
            padding: 1rem;
        }

        .balance .amount {
            font-size: 2rem;
        }

        .modal-content {
            margin: 1rem;
            padding: 1.5rem;
        }

        .transaction-actions {
            flex-direction: column;
        }

        .transaction-actions button {
            width: 100%;
        }

        .account-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
        }

        .account-status {
            align-self: flex-start;
        }

        .account-id {
            flex-wrap: wrap;
            gap: 0.75rem;
        }

        .btn-copy {
            margin-left: auto;
        }

        .account-balance {
            font-size: 1.25rem;
        }

        .account-list .btn-secondary {
            width: 100%;
        }

        .btn-theme {
            font-size: 1.5rem;
        }

        .transactions {
            max-height: 500px;
        }

        .transaction-list {
            max-height: 450px;
        }
    }
</style> 