<script lang="ts">
    import { auth } from '$lib/services/firebase';
    import { signInWithEmailAndPassword } from 'firebase/auth';
    import { CustomerModel } from '$lib/models/Customer';
    import { goto } from '$app/navigation';
    import type { AuthError } from 'firebase/auth';

    let email = '';
    let password = '';
    let error = '';
    let loading = false;

    async function handleSubmit() {
        if (!email || !password) {
            error = 'Please fill in all fields';
            return;
        }

        try {
            loading = true;
            error = '';
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            
            // Verify customer exists
            const customer = await CustomerModel.getCustomer(userCredential.user.uid);
            if (!customer) {
                await auth.signOut();
                error = 'Account not found';
                return;
            }

            goto('/dashboard');
        } catch (e) {
            const authError = e as AuthError;
            switch (authError.code) {
                case 'auth/invalid-email':
                    error = 'Invalid email address';
                    break;
                case 'auth/user-disabled':
                    error = 'This account has been disabled';
                    break;
                case 'auth/user-not-found':
                    error = 'No account found with this email';
                    break;
                case 'auth/wrong-password':
                    error = 'Incorrect password';
                    break;
                default:
                    error = 'An error occurred. Please try again';
            }
        } finally {
            loading = false;
        }
    }
</script>

<div class="login-container">
    <div class="login-card">
        <div class="login-header">
            <h1>Welcome Back</h1>
            <p>Sign in to your account</p>
        </div>

        <form on:submit|preventDefault={handleSubmit} class="login-form">
            {#if error}
                <div class="error-message" role="alert">
                    {error}
                </div>
            {/if}

            <div class="form-group">
                <label for="email">Email</label>
                <input
                    type="email"
                    id="email"
                    bind:value={email}
                    placeholder="Enter your email"
                    required
                    autocomplete="email"
                />
            </div>

            <div class="form-group">
                <label for="password">Password</label>
                <input
                    type="password"
                    id="password"
                    bind:value={password}
                    placeholder="Enter your password"
                    required
                    autocomplete="current-password"
                />
            </div>

            <button type="submit" class="btn-login" disabled={loading}>
                {#if loading}
                    <span class="loading-spinner"></span>
                {:else}
                    Sign In
                {/if}
            </button>
        </form>

        <div class="login-footer">
            <p>Don't have an account? <a href="/register">Create one</a></p>
        </div>
    </div>
</div>

<style>
    .login-container {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem;
        background: linear-gradient(to right, #f0f9ff, #e0f2fe);
    }

    .login-card {
        background: white;
        padding: 2.5rem;
        border-radius: 1rem;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        width: 100%;
        max-width: 400px;
    }

    .login-header {
        text-align: center;
        margin-bottom: 2rem;
    }

    .login-header h1 {
        color: #1e293b;
        font-size: 1.875rem;
        font-weight: 700;
        margin-bottom: 0.5rem;
    }

    .login-header p {
        color: #64748b;
    }

    .login-form {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
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
        transition: border-color 0.2s;
    }

    .form-group input:focus {
        outline: none;
        border-color: #2563eb;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }

    .btn-login {
        background: #2563eb;
        color: white;
        padding: 0.75rem;
        border: none;
        border-radius: 0.375rem;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s;
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 0.5rem;
    }

    .btn-login:hover:not(:disabled) {
        background: #1d4ed8;
    }

    .btn-login:disabled {
        opacity: 0.7;
        cursor: not-allowed;
    }

    .loading-spinner {
        width: 1.25rem;
        height: 1.25rem;
        border: 2px solid #ffffff;
        border-top-color: transparent;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    .error-message {
        background: #fee2e2;
        color: #dc2626;
        padding: 0.75rem;
        border-radius: 0.375rem;
        font-size: 0.875rem;
    }

    .login-footer {
        margin-top: 2rem;
        text-align: center;
        color: #64748b;
        font-size: 0.875rem;
    }

    .login-footer a {
        color: #2563eb;
        text-decoration: none;
        font-weight: 500;
    }

    .login-footer a:hover {
        text-decoration: underline;
    }

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }

    @media (max-width: 640px) {
        .login-card {
            padding: 1.5rem;
        }

        .login-header h1 {
            font-size: 1.5rem;
        }
    }
</style> 