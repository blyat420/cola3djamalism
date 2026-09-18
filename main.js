(function () {
  'use strict';

  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 1. Data Store GSAP (Posisi, Skala, dan Orientasi Kaleng)
  const canState = {
    x: 35,        // Offset awal diatur sesuai pembaruan Anda
    y: 2,         
    scale: 1,     
    rotZ: 5,      
    rotY: 18,     
    floatY: 0     
  };

  // 2. Setup Three.js
  let scene, camera, renderer, loadedModel;
  const canvas = document.getElementById('coke-canvas');

  function initThreeJS() {
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 6;

    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Linear tone mapping untuk menjaga saturasi merah tua tanpa memutihkan specular highlight
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.LinearToneMapping;
    renderer.toneMappingExposure = 1.0;

    // Pencahayaan studio seimbang
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.85);
    keyLight.position.set(3, 4, 3);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.45);
    rimLight.position.set(-3, 2, -3);
    scene.add(rimLight);

    // 3. Load Model GLB & Override Material
    const loader = new THREE.GLTFLoader();
    loader.load(
      'coca_cola_soda_can.glb',
      function (gltf) {
        const model = gltf.scene;

        model.traverse((child) => {
          if (child.isMesh && child.material) {
            const mats = Array.isArray(child.material) ? child.material : [child.material];

            mats.forEach((mat) => {
              // Matikan emissive bawaan file agar tidak menyala sendiri
              if (mat.emissive) {
                mat.emissive.setHex(0x000000);
                mat.emissiveIntensity = 0;
              }
              if (mat.emissiveMap) {
                mat.emissiveMap = null;
              }

              // Pastikan encoding tekstur sRGB
              if (mat.map) {
                mat.map.encoding = THREE.sRGBEncoding;
                mat.map.needsUpdate = true;
              }

              // Redam kecerahan base color agar pigmen merah pekat
              mat.color.setRGB(0.55, 0.55, 0.55);

              // Batasi pantulan
              mat.metalness = 0.12;
              mat.roughness = 0.42;
              mat.needsUpdate = true;
            });
          }
        });

        // Normalisasi ukuran dan pivot center
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);

        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const targetHeight = 2.1;
        const scaleFactor = targetHeight / (maxDim || 1);
        model.scale.setScalar(scaleFactor);

        loadedModel = new THREE.Group();
        loadedModel.add(model);
        scene.add(loadedModel);
      },
      undefined,
      function (error) {
        console.error('Gagal memuat GLB:', error);
      }
    );

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    renderLoop();
  }

  // 4. Render Loop
  function renderLoop() {
    requestAnimationFrame(renderLoop);

    if (loadedModel) {
      const vFOV = THREE.MathUtils.degToRad(camera.fov);
      const height = 2 * Math.tan(vFOV / 2) * camera.position.z;
      const width = height * camera.aspect;

      const targetX = (canState.x / 100) * width;
      const targetY = -(canState.y / 100) * height + canState.floatY;

      loadedModel.position.x = targetX;
      loadedModel.position.y = targetY;
      loadedModel.scale.setScalar(canState.scale);
      loadedModel.rotation.z = THREE.MathUtils.degToRad(-canState.rotZ);
      loadedModel.rotation.y = THREE.MathUtils.degToRad(canState.rotY);
    }

    renderer.render(scene, camera);
  }

  // 5. Koreografi Scroll GSAP (Menggunakan Koordinat Kustom Anda)
  let followTL = null;

  function setupFollow() {
    if (followTL && followTL.scrollTrigger) followTL.scrollTrigger.kill();
    gsap.killTweensOf(canState);

    const amp = window.innerWidth < 760 ? 0.42 : 1;
    const sc = window.innerWidth < 760 ? 0.8 : 1;

    // Reset posisi awal
    canState.x = 35 * amp;
    canState.y = 2;
    canState.scale = 1 * sc;
    canState.rotZ = 5;
    canState.rotY = 18;

    followTL = gsap.timeline({
      scrollTrigger: {
        trigger: document.body,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.9
      }
    });

    followTL
      // hero → since
      .to(canState, { x: -27 * amp, y: 15, scale: 0.78 * sc, rotZ: -6, ease: 'power2.inOut', duration: 1.2 }, 0.55)
      // → signature / script
      .to(canState, { x: 35 * amp,  y: -3, scale: 0.62 * sc, rotZ: 4,  ease: 'power2.inOut', duration: 1.2 }, 1.75)
      // → journey
      .to(canState, { x: 25 * amp,  y: -3, scale: 0.90 * sc, rotZ: -5, ease: 'power2.inOut', duration: 1.2 }, 2.95)
      // → polaroids
      .to(canState, { x: 27 * amp,  y: 8,  scale: 0.52 * sc, rotZ: 6,  ease: 'power2.inOut', duration: 1.2 }, 4.15)
      // → anatomy
      .to(canState, { x: -28 * amp, y: 4,  scale: 0.60 * sc, rotZ: -4, ease: 'power2.inOut', duration: 1.2 }, 5.35)
      // → marquees sweep
      .to(canState, { x: -10,        y: -2, scale: 1.05 * sc, rotZ: 2,  ease: 'power3.inOut', duration: 1.3 }, 6.5)
      // → makers
      .to(canState, { x: 27 * amp,  y: 5,  scale: 0.66 * sc, rotZ: 7,  ease: 'power2.inOut', duration: 1.2 }, 7.8)
      // → floating input
      .to(canState, { x: -28 * amp, y: 0,  scale: 0.80 * sc, rotZ: -5, ease: 'power2.inOut', duration: 1.1 }, 9.0)
      // Footer: Posisi bersandar di kiri bawah
      .to(canState, { x: -32 * amp, y: 24, scale: 1.25 * sc, rotZ: 12, ease: 'power2.out',   duration: 1.0 }, 10.3);

    // Rotasi seiring scroll
    followTL
      .to(canState, { rotY: 1440, ease: 'none', duration: 11.3 }, 0)
      .to(canState, { rotY: '+=360', ease: 'power1.inOut', duration: 1.4 }, 6.5);
  }

  function idleMotion() {
    gsap.to(canState, { floatY: 0.15, duration: 2.8, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  }

  // 6. Interaksi UI & DOM
  function heroParallax() {
    const bg = document.querySelector('[data-parallax-bg]');
    const fg = document.querySelector('[data-parallax-fg]');
    if (!bg || !fg) return;
    const bgSpeed = parseFloat(bg.dataset.speed) || 0.4;
    const fgSpeed = parseFloat(fg.dataset.speed) || 0.9;
    gsap.to(bg, { yPercent: 25 * bgSpeed, ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to(fg, { yPercent: -50 * fgSpeed, opacity: 0, ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true } });
  }

  function scrollReveal() {
    document.querySelectorAll('.reveal').forEach(el => {
      ScrollTrigger.create({ trigger: el, start: 'top 82%', once: true, onEnter: () => el.classList.add('is-visible') });
    });
  }

  function counters() {
    document.querySelectorAll('.counter').forEach(el => {
      const target = parseFloat(el.dataset.target) || 0;
      const duration = parseFloat(el.dataset.duration) || 1.8;
      const obj = { val: 0 };
      ScrollTrigger.create({
        trigger: el, start: 'top 85%', once: true,
        onEnter: () => {
          gsap.to(obj, { val: target, duration, ease: 'power2.out', onUpdate: () => { el.textContent = Math.round(obj.val).toLocaleString(); } });
        }
      });
    });
  }

  function svgDraw() {
    document.querySelectorAll('.svg-draw').forEach(svg => {
      svg.querySelectorAll('.svg-draw__path').forEach(path => {
        path.style.setProperty('--path-length', path.getTotalLength());
      });
      ScrollTrigger.create({ trigger: svg, start: 'top 75%', once: true, onEnter: () => svg.classList.add('is-drawn') });
    });
  }

  function svgScrollDraw() {
    document.querySelectorAll('.svg-scroll-path').forEach(svg => {
      const path = svg.querySelector('.svg-scroll-path__line');
      if (!path) return;
      const len = path.getTotalLength();
      gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
      gsap.to(path, { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: svg.closest('.journey'), start: 'top 60%', end: 'bottom 40%', scrub: true } });
    });
  }

  function polaroids() {
    document.querySelectorAll('.polaroid-stack').forEach(stack => {
      const cards = stack.querySelectorAll('.polaroid');
      ScrollTrigger.create({
        trigger: stack, start: 'top 75%', once: true,
        onEnter: () => cards.forEach((card, i) => setTimeout(() => card.classList.add('is-visible'), i * 180))
      });
    });
  }

  function scrollSpy() {
    const items = document.querySelectorAll('.scroll-spy__item');
    const states = document.querySelectorAll('.illustration-state');
    const sections = document.querySelectorAll('[data-step-section]');
    if (!items.length || !sections.length) return;

    sections.forEach(section => {
      const step = section.dataset.stepSection;
      ScrollTrigger.create({
        trigger: section, start: 'top 55%', end: 'bottom 45%',
        onEnter: () => activate(step),
        onEnterBack: () => activate(step)
      });
    });

    function activate(step) {
      items.forEach(it => it.classList.toggle('is-active', it.dataset.step === step));
      states.forEach(st => st.classList.toggle('is-active', st.dataset.state === step));
    }
  }

  function progressLines() {
    document.querySelectorAll('.narrative-step').forEach(section => {
      const fill = section.querySelector('.progress-line__fill');
      if (!fill) return;
      gsap.to(fill, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: section, start: 'top 70%', end: 'bottom 30%', scrub: true } });
    });
  }

  function profileCards() {
    const cards = gsap.utils.toArray('.profile-card');
    if (!cards.length) return;
    cards.forEach((card, i) => {
      ScrollTrigger.create({
        trigger: card, start: 'top 88%', once: true,
        onEnter: () => setTimeout(() => card.classList.add('is-visible'), i * 140)
      });
    });
  }

  function curtainFooter() {
    const footer = document.querySelector('.curtain-footer');
    if (!footer) return;
    ScrollTrigger.create({ trigger: footer, start: 'top 90%', once: true, onEnter: () => footer.classList.add('is-revealed') });
  }

  function pageTransition() {
    const overlay = document.querySelector('.page-transition');
    if (!overlay) return;
    window.triggerPageTransition = (cb) => {
      overlay.classList.remove('is-active');
      void overlay.offsetWidth;
      overlay.classList.add('is-active');
      if (typeof cb === 'function') setTimeout(cb, 550);
    };
    document.querySelectorAll('[data-transition]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const href = btn.dataset.href || '#';
        window.triggerPageTransition(() => { window.location.href = href; });
      });
    });
  }

  // 7. Booting
  function init() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
      console.warn('GSAP / ScrollTrigger belum termuat.');
      return;
    }
    gsap.registerPlugin(ScrollTrigger);

    initThreeJS();

    if (!REDUCED) {
      setupFollow();
      idleMotion();
    }

    heroParallax();
    scrollReveal();
    counters();
    svgDraw();
    svgScrollDraw();
    polaroids();
    scrollSpy();
    progressLines();
    profileCards();
    curtainFooter();
    pageTransition();

    ScrollTrigger.refresh();
  }

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (!REDUCED) setupFollow();
      ScrollTrigger.refresh();
    }, 250);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();