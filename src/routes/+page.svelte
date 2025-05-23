<script>
  import { onMount } from "svelte";
  import { auth } from "$lib/services/firebase";
  import { goto } from "$app/navigation";

  let isLoggedIn = false;

  onMount(() => {
    auth.onAuthStateChanged((user) => {
      isLoggedIn = !!user;
    });
  });

  function handleGetStarted() {
    if (isLoggedIn) {
      goto("/dashboard");
    } else {
      goto("/login");
    }
  }
</script>

<main class="landing-page">
  <nav class="navbar">
    <div class="logo">BankPro</div>
    <div class="nav-links">
      {#if isLoggedIn}
        <a href="/dashboard" class="nav-link">Dashboard</a>
        <a href="/profile" class="nav-link">Profile</a>
        <button class="btn-logout" on:click={() => auth.signOut()}
          >Logout</button
        >
      {:else}
        <a href="/login" class="nav-link">Login</a>
        <a href="/register" class="btn-primary">Sign Up</a>
      {/if}
    </div>
  </nav>

  <section class="hero">
    <div class="hero-content">
      <h1>Modern Banking for the Digital Age</h1>
      <p>
        Experience seamless banking with our secure and user-friendly platform
      </p>
      <button class="btn-primary" on:click={handleGetStarted}>
        {isLoggedIn ? "Go to Dashboard" : "Get Started"}
      </button>
    </div>
    <div class="hero-image">
      <img src="/banking-illustration.svg" alt="Banking Illustration" />
    </div>
  </section>

  <section class="features">
    <h2>Why Choose Us</h2>
    <div class="feature-grid">
      <div class="feature-card">
        <div class="feature-icon">🔒</div>
        <h3>Secure Transactions</h3>
        <p>Bank-grade security for all your transactions</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">⚡</div>
        <h3>Fast Transfers</h3>
        <p>Instant money transfers anytime, anywhere</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">📱</div>
        <h3>Mobile First</h3>
        <p>Bank on the go with our mobile-friendly platform</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">💳</div>
        <h3>Easy Payments</h3>
        <p>Simple and secure payment solutions</p>
      </div>
    </div>
  </section>

  <section class="cta">
    <h2>Ready to Get Started?</h2>
    <p>Join thousands of satisfied customers today</p>
    <button class="btn-primary" on:click={handleGetStarted}>
      {isLoggedIn ? "Go to Dashboard" : "Create Account"}
    </button>
  </section>

  <footer>
    <div class="footer-content">
      <div class="footer-section">
        <h4>BankPro</h4>
        <p>Modern banking solutions for everyone</p>
      </div>
      <div class="footer-section">
        <h4>Quick Links</h4>
        <a href="/about">About Us</a>
        <a href="/contact">Contact</a>
        <a href="/privacy">Privacy Policy</a>
      </div>
      <div class="footer-section">
        <h4>Contact Us</h4>
        <p>Email: support@bankpro.com</p>
        <p>Phone: (555) 123-4567</p>
      </div>
    </div>
    <div class="footer-bottom">
      <p>&copy; 2024 BankPro. All rights reserved.</p>
    </div>
  </footer>
</main>

<style>
  .landing-page {
    min-height: 100vh;
    font-family: "Inter", sans-serif;
  }

  .navbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 5%;
    background: white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    position: fixed;
    width: 100%;
    top: 0;
    z-index: 1000;
  }

  .logo {
    font-size: 1.5rem;
    font-weight: bold;
    color: #2563eb;
  }

  .nav-links {
    display: flex;
    gap: 1.5rem;
    align-items: center;
  }

  .nav-link {
    text-decoration: none;
    color: #4b5563;
    font-weight: 500;
  }

  .btn-primary {
    background: #2563eb;
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    border: none;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .btn-primary:hover {
    background: #1d4ed8;
  }

  .btn-logout {
    background: none;
    border: none;
    color: #4b5563;
    cursor: pointer;
    font-weight: 500;
  }

  .hero {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8rem 5% 4rem;
    background: linear-gradient(to right, #f0f9ff, #e0f2fe);
  }

  .hero-content {
    max-width: 600px;
  }

  .hero h1 {
    font-size: 3rem;
    color: #1e293b;
    margin-bottom: 1rem;
  }

  .hero p {
    font-size: 1.25rem;
    color: #64748b;
    margin-bottom: 2rem;
  }

  .hero-image img {
    max-width: 500px;
    height: auto;
  }

  .features {
    padding: 4rem 5%;
    background: white;
  }

  .features h2 {
    text-align: center;
    font-size: 2rem;
    color: #1e293b;
    margin-bottom: 3rem;
  }

  .feature-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  .feature-card {
    padding: 2rem;
    background: #f8fafc;
    border-radius: 0.5rem;
    text-align: center;
    transition: transform 0.2s;
  }

  .feature-card:hover {
    transform: translateY(-5px);
  }

  .feature-icon {
    font-size: 2rem;
    margin-bottom: 1rem;
  }

  .feature-card h3 {
    color: #1e293b;
    margin-bottom: 0.5rem;
  }

  .feature-card p {
    color: #64748b;
  }

  .cta {
    padding: 4rem 5%;
    background: #2563eb;
    color: white;
    text-align: center;
  }

  .cta h2 {
    font-size: 2rem;
    margin-bottom: 1rem;
  }

  .cta p {
    margin-bottom: 2rem;
    opacity: 0.9;
  }

  .cta .btn-primary {
    background: white;
    color: #2563eb;
  }

  .cta .btn-primary:hover {
    background: #f8fafc;
  }

  footer {
    background: #1e293b;
    color: white;
    padding: 4rem 5% 2rem;
  }

  .footer-content {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  .footer-section h4 {
    margin-bottom: 1rem;
    font-size: 1.1rem;
  }

  .footer-section a {
    display: block;
    color: #94a3b8;
    text-decoration: none;
    margin-bottom: 0.5rem;
  }

  .footer-section a:hover {
    color: white;
  }

  .footer-bottom {
    text-align: center;
    margin-top: 3rem;
    padding-top: 2rem;
    border-top: 1px solid #334155;
    color: #94a3b8;
  }

  @media (max-width: 768px) {
    .hero {
      flex-direction: column;
      text-align: center;
      padding-top: 6rem;
    }

    .hero-content {
      margin-bottom: 2rem;
    }

    .hero h1 {
      font-size: 2.5rem;
    }

    .hero-image img {
      max-width: 100%;
    }
  }
</style>
