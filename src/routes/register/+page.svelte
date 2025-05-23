<script lang="ts">
    import { auth } from '$lib/services/firebase';
    import { createUserWithEmailAndPassword } from 'firebase/auth';
    import { CustomerModel } from '$lib/models/Customer';
    import { goto } from '$app/navigation';
    import type { AuthError } from 'firebase/auth';

    let email = '';
    let password = '';
    let confirmPassword = '';
    let firstName = '';
    let lastName = '';
    let phoneNumber = '';
    let dob = '';
    let error = '';
    let loading = false;

    async function handleSubmit() {
        if (!email || !password || !confirmPassword || !firstName || !lastName || !phoneNumber || !dob) {
            error = 'Please fill in all fields';
            return;
        }

        if (password !== confirmPassword) {
            error = 'Passwords do not match';
            return;
        }

        if (password.length < 6) {
            error = 'Password must be at least 6 characters';
            return;
        }

        // Validate phone number format
        const phoneRegex = /^\+?[\d\s-]{10,}$/;
        if (!phoneRegex.test(phoneNumber)) {
            error = 'Please enter a valid phone number';
            return;
        }

        // Validate date of birth
        const dobDate = new Date(dob);
        const today = new Date();
        const age = today.getFullYear() - dobDate.getFullYear();
        if (age < 18) {
            error = 'You must be at least 18 years old to register';
            return;
        }

        try {
            loading = true;
            error = '';
            console.log('Creating Firebase Auth user...');
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            console.log('Firebase Auth user created successfully:', userCredential.user.uid);
            
            try {
                console.log('Creating customer record...');
                // Create customer record
                await CustomerModel.createCustomer(userCredential.user.uid, {
                    firstName,
                    lastName,
                    email,
                    phoneNumber,
                    dob
                });
                console.log('Customer record created successfully');
                goto('/dashboard');
            } catch (customerError) {
                console.error('Error creating customer record:', customerError);
                // If customer creation fails, delete the auth user
                try {
                    await userCredential.user.delete();
                    console.log('Auth user deleted due to customer creation failure');
                } catch (deleteError) {
                    console.error('Error deleting auth user:', deleteError);
                }
                error = 'Failed to create customer record. Please try again.';
            }
        } catch (e) {
            console.error('Registration error:', e);
            const authError = e as AuthError;
            switch (authError.code) {
                case 'auth/email-already-in-use':
                    error = 'Email already in use';
                    break;
                case 'auth/invalid-email':
                    error = 'Invalid email address';
                    break;
                case 'auth/weak-password':
                    error = 'Password is too weak';
                    break;
                default:
                    error = `Registration failed: ${authError.message}`;
            }
        } finally {
            loading = false;
        }
    }
</script>

<div class="register-container">
    <div class="register-card">
        <div class="register-header">
            <h1>Create Account</h1>
            <p>Join our banking platform today</p>
        </div>

        <form on:submit|preventDefault={handleSubmit} class="register-form">
            {#if error}
                <div class="error-message" role="alert">
                    {error}
                </div>
            {/if}

            <div class="form-row">
                <div class="form-group">
                    <label for="firstName">First Name</label>
                    <input
                        type="text"
                        id="firstName"
                        bind:value={firstName}
                        placeholder="Enter your first name"
                        required
                        autocomplete="given-name"
                    />
                </div>

                <div class="form-group">
                    <label for="lastName">Last Name</label>
                    <input
                        type="text"
                        id="lastName"
                        bind:value={lastName}
                        placeholder="Enter your last name"
                        required
                        autocomplete="family-name"
                    />
                </div>
            </div>

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
                <label for="phoneNumber">Phone Number</label>
                <input
                    type="tel"
                    id="phoneNumber"
                    bind:value={phoneNumber}
                    placeholder="Enter your phone number"
                    required
                    autocomplete="tel"
                />
            </div>

            <div class="form-group">
                <label for="dob">Date of Birth</label>
                <input
                    type="date"
                    id="dob"
                    bind:value={dob}
                    required
                    max={new Date().toISOString().split('T')[0]}
                />
            </div>

            <div class="form-group">
                <label for="password">Password</label>
                <input
                    type="password"
                    id="password"
                    bind:value={password}
                    placeholder="Create a password"
                    required
                    autocomplete="new-password"
                />
            </div>

            <div class="form-group">
                <label for="confirmPassword">Confirm Password</label>
                <input
                    type="password"
                    id="confirmPassword"
                    bind:value={confirmPassword}
                    placeholder="Confirm your password"
                    required
                    autocomplete="new-password"
                />
            </div>

            <button type="submit" class="btn-register" disabled={loading}>
                {#if loading}
                    <span class="loading-spinner"></span>
                {:else}
                    Create Account
                {/if}
            </button>
        </form>

        <div class="register-footer">
            <p>Already have an account? <a href="/login">Sign in</a></p>
        </div>
    </div>
</div>

<style>
    .register-container {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem;
        background: linear-gradient(to right, #f0f9ff, #e0f2fe);
    }

    .register-card {
        background: white;
        padding: 2.5rem;
        border-radius: 1rem;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        width: 100%;
        max-width: 500px;
    }

    .register-header {
        text-align: center;
        margin-bottom: 2rem;
    }

    .register-header h1 {
        color: #1e293b;
        font-size: 1.875rem;
        font-weight: 700;
        margin-bottom: 0.5rem;
    }

    .register-header p {
        color: #64748b;
    }

    .register-form {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }

    .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
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
        transition: border-color 0.2s;
    }

    .form-group input:focus {
        outline: none;
        border-color: #2563eb;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }

    .btn-register {
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

    .btn-register:hover:not(:disabled) {
        background: #1d4ed8;
    }

    .btn-register:disabled {
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

    .register-footer {
        margin-top: 2rem;
        text-align: center;
        color: #64748b;
        font-size: 0.875rem;
    }

    .register-footer a {
        color: #2563eb;
        text-decoration: none;
        font-weight: 500;
    }

    .register-footer a:hover {
        text-decoration: underline;
    }

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }

    @media (max-width: 640px) {
        .register-card {
            padding: 1.5rem;
        }

        .register-header h1 {
            font-size: 1.5rem;
        }

        .form-row {
            grid-template-columns: 1fr;
        }
    }
</style> 