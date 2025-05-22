<script>
    import '../app.css';
</script>

<svelte:head>
    <title>BankPro - Modern Banking Solutions</title>
    <meta name="description" content="Experience seamless banking with our secure and user-friendly platform" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</svelte:head>

<slot />

<style>
    :global(*) {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
    }

    :global(body) {
        font-family: 'Inter', sans-serif;
        line-height: 1.5;
        color: #1e293b;
    }

    :global(a) {
        text-decoration: none;
        color: inherit;
    }

    :global(button) {
        font-family: inherit;
    }
</style> 