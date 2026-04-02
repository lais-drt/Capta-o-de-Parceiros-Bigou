document.addEventListener('DOMContentLoaded', () => {
    const ownerStateSelect = document.getElementById('ownerState');
    const ownerCitySelect = document.getElementById('ownerCity');
    const phoneInputs = [
        document.getElementById('ownerPhone')
    ].filter(Boolean);

    const setSelectOptions = (select, placeholder, items = []) => {
        const optionsHtml = [`<option value="">${placeholder}</option>`]
            .concat(items.map((item) => `<option value="${item.value}">${item.label}</option>`))
            .join('');
        select.innerHTML = optionsHtml;
    };

    const fetchStates = async () => {
        const response = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome');
        if (!response.ok) throw new Error('Falha ao carregar estados');
        return response.json();
    };

    const fetchCitiesByState = async (uf) => {
        const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`);
        if (!response.ok) throw new Error('Falha ao carregar cidades');
        return response.json();
    };

    const loadStates = async () => {
        if (!ownerStateSelect || !ownerCitySelect) return;
        ownerStateSelect.disabled = true;
        setSelectOptions(ownerStateSelect, 'Carregando estados...');
        setSelectOptions(ownerCitySelect, 'Selecione o estado primeiro');
        ownerCitySelect.disabled = true;

        try {
            const states = await fetchStates();
            const stateOptions = states.map((state) => ({
                value: state.sigla,
                label: state.nome
            }));
            setSelectOptions(ownerStateSelect, 'Selecione', stateOptions);
            ownerStateSelect.disabled = false;
        } catch (error) {
            console.error(error);
            setSelectOptions(ownerStateSelect, 'Nao foi possivel carregar os estados');
            ownerStateSelect.disabled = true;
        }
    };

    const loadCities = async (uf) => {
        if (!ownerCitySelect) return;
        ownerCitySelect.disabled = true;
        setSelectOptions(ownerCitySelect, 'Carregando cidades...');

        try {
            const cities = await fetchCitiesByState(uf);
            const cityOptions = cities.map((city) => ({
                value: city.nome,
                label: city.nome
            }));
            setSelectOptions(ownerCitySelect, 'Selecione a cidade', cityOptions);
            ownerCitySelect.disabled = false;
        } catch (error) {
            console.error(error);
            setSelectOptions(ownerCitySelect, 'Nao foi possivel carregar as cidades');
            ownerCitySelect.disabled = true;
        }
    };

    const formatPhone = (value) => {
        const digits = value.replace(/\D/g, '').slice(0, 11);
        if (!digits) return '';

        const ddd = digits.slice(0, 2);
        const middle = digits.length > 10 ? digits.slice(2, 7) : digits.slice(2, 6);
        const end = digits.length > 10 ? digits.slice(7, 11) : digits.slice(6, 10);

        if (digits.length <= 2) return `(${ddd}`;
        if (digits.length <= 6) return `(${ddd}) ${middle}`;
        return `(${ddd}) ${middle}-${end}`;
    };

    phoneInputs.forEach((input) => {
        input.addEventListener('input', (event) => {
            event.target.value = formatPhone(event.target.value);
        });
    });

    if (ownerStateSelect) {
        ownerStateSelect.addEventListener('change', (event) => {
            const uf = event.target.value;
            if (!uf) {
                ownerCitySelect.disabled = true;
                setSelectOptions(ownerCitySelect, 'Selecione o estado primeiro');
                return;
            }
            loadCities(uf);
        });
    }

    loadStates();
    
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
    const formFeedback = document.getElementById('form-feedback');

    const setFormFeedback = (type, message) => {
        if (!formFeedback) return;
        formFeedback.textContent = message || '';
        formFeedback.hidden = !message;
        formFeedback.classList.remove('form-feedback--success', 'form-feedback--error');
        if (type === 'success') formFeedback.classList.add('form-feedback--success');
        if (type === 'error') formFeedback.classList.add('form-feedback--error');
    };

    registrationForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const btn = registrationForm.querySelector('button[type="submit"]');
        const originalText = btn.innerText;

        setFormFeedback(null, '');

        btn.innerText = 'Processando...';
        btn.disabled = true;
        btn.style.opacity = '0.7';

        const formData = new FormData(registrationForm);
        const data = Object.fromEntries(formData.entries());
        const payload = { data };

        const leadUrl = import.meta.env.VITE_LEAD_URL || '/api/lead';

        fetch(leadUrl, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        })
        .then(async (response) => {
            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                let msg = result.error || 'Erro ao enviar cadastro';
                if (result.detail) {
                    msg += '\n\n' + result.detail;
                }
                throw new Error(msg);
            }
            return result;
        })
        .then(() => {
            // Disparar evento de Lead (Cadastro) para o Meta Pixel
            if (window.fbq) {
                window.fbq('track', 'Lead');
            }

            registrationForm.reset();
            if (ownerCitySelect) {
                ownerCitySelect.disabled = true;
                setSelectOptions(ownerCitySelect, 'Selecione o estado primeiro');
            }
            loadStates();
            setFormFeedback(
                'success',
                'Cadastro enviado com sucesso! Entraremos em contato em breve.'
            );
            formFeedback?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        })
        .catch((error) => {
            console.error('Error:', error);
            setFormFeedback(
                'error',
                error.message ||
                    'Não foi possível enviar o cadastro. Tente novamente ou fale conosco pelo WhatsApp.'
            );
            formFeedback?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        })
        .finally(() => {
            btn.innerText = originalText;
            btn.disabled = false;
            btn.style.opacity = '1';
        });
    });

});
