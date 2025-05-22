<script>
    import { onMount } from 'svelte';
    import { UserController } from '../controllers/UserController';
    import { auth } from '../services/firebase';

    let user = null;
    let balance = 0;
    let loading = true;
    let error = null;

    onMount(async () => {
        try {
            if (auth.currentUser) {
                user = await UserController.getUser(auth.currentUser.uid);
                balance = user.balance;
            }
        } catch (e) {
            error = e.message;
        } finally {
            loading = false;
        }
    });
</script>

<div class="dashboard">
    {#if loading}
        <p>Loading...</p>
    {:else if error}
        <p class="error">{error}</p>
    {:else if user}
        <h1>Welcome, {user.name}!</h1>
        <div class="balance-card">
            <h2>Current Balance</h2>
            <p class="balance">${balance.toFixed(2)}</p>
        </div>
    {:else}
        <p>Please log in to view your dashboard.</p>
    {/if}
</div>

<style>
    .dashboard {
        padding: 2rem;
        max-width: 800px;
        margin: 0 auto;
    }

    .balance-card {
        background: #f5f5f5;
        padding: 2rem;
        border-radius: 8px;
        margin-top: 2rem;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .balance {
        font-size: 2rem;
        font-weight: bold;
        color: #2c3e50;
    }

    .error {
        color: #e74c3c;
    }
</style> 