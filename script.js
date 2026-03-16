document.addEventListener('DOMContentLoaded', () => {
    
    // --- Smooth Scrolling for Anchor Links ---
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // --- Counter Animation ---
    const counters = document.querySelectorAll('.counter');
    const animationDuration = 2000; // 2 seconds

    const animateCounters = (entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const counter = entry.target;
                const target = parseInt(counter.getAttribute('data-target'));
                const frameDuration = 1000 / 60; // 60fps
                const totalFrames = Math.round(animationDuration / frameDuration);
                let frame = 0;

                const counterUpdater = setInterval(() => {
                    frame++;
                    const progress = frame / totalFrames;
                    const easeOutQuart = 1 - Math.pow(1 - progress, 4); // Smooth easing
                    
                    let currentCount = Math.round(target * easeOutQuart);
                    
                    // Format number with dots (e.g., 500.000)
                    counter.innerText = '+' + currentCount.toLocaleString('pt-BR');

                    if (frame === totalFrames) {
                        clearInterval(counterUpdater);
                        counter.innerText = '+' + target.toLocaleString('pt-BR');
                    }
                }, frameDuration);

                // Stop observing once animated
                observer.unobserve(counter);
            }
        });
    };

    const counterObserver = new IntersectionObserver(animateCounters, {
        threshold: 0.5 // Trigger when 50% visible
    });

    counters.forEach(counter => {
        counterObserver.observe(counter);
    });


    // --- Cities Modal ---
    const modal = document.getElementById('cities-modal');
    const openBtns = document.querySelectorAll('#open-cities-btn, .open-cities-footer');
    const closeBtn = document.getElementById('close-cities-btn');

    const openModal = () => {
        modal.style.display = 'flex';
        // Small delay to allow display:flex to apply before adding the show class for transition
        setTimeout(() => {
            modal.classList.add('show');
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
        }, 10);
    };

    const closeModal = () => {
        modal.classList.remove('show');
        document.body.style.overflow = ''; // Restore scrolling
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300); // Match CSS transition duration
    };

    openBtns.forEach(btn => btn.addEventListener('click', (e) => {
        e.preventDefault();
        openModal();
    }));
    closeBtn.addEventListener('click', closeModal);

    // Close modal when clicking outside content
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    // Close modal with Escape key
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'flex') {
            closeModal();
        }
    });

    // --- Form Handling ---
    const registrationForm = document.getElementById('partner-form');
    
    registrationForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const btn = registrationForm.querySelector('button[type="submit"]');
        const originalText = btn.innerText;
        
        btn.innerText = 'Processando...';
        btn.disabled = true;
        btn.style.opacity = '0.7';

        // Gather form data
        const formData = new FormData(registrationForm);
        const data = Object.fromEntries(formData.entries());
        
        // SheetDB expects { "data": { ... } } format (or an array of objects)
        const payload = {
            data: data
        };

        // Send data to SheetDB
        fetch('https://sheetdb.io/api/v1/wqi0mdg8qkcnt', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })
        .then(response => response.json())
        .then(result => {
            console.log('Success:', result);
            alert('Cadastro recebido com sucesso! Nossa equipe entrará em contato em breve.');
            registrationForm.reset();
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Ocorreu um erro ao enviar seu cadastro. Por favor, tente novamente ou entre em contato pelo WhatsApp.');
        })
        .finally(() => {
            btn.innerText = originalText;
            btn.disabled = false;
            btn.style.opacity = '1';
        });
    });

});
