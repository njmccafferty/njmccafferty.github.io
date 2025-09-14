// Flappy Gav 4D – Forever Citizen
// WebGL 3D Tunnel Runner Game

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

class FlappyGavGame {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.canvas = null;
        
        // Game state
        this.gameState = 'splash'; // splash, playing, gameOver
        this.score = 0;
        this.timeLeft = 60;
        this.streak = 0;
        this.speed = 1.0;
        
        // Tutorial mode
        this.tutorialMode = true;
        this.tutorialStartTime = 0;
        this.noObstaclesTime = 0;
        this.countdownStartTime = 0;
        this.countdownValue = 20;
        this.countdownActive = false;
        this.obstacleSpeedMultiplier = 1.0;
        
        // Gav character
        this.gav = null;
        this.gavPosition = { x: 0, y: 0, z: 0 }; // Altitude 2.0 = y = 0
        this.gavVelocity = { x: 0, y: 0, z: 0 };
        this.gavRotation = { x: 0, y: 0, z: 0 };
        
        // Head spin animation
        this.headSpinRotation = 0;
        this.lastSpinTime = 0;
        this.isSpinning = false;
        this.spinStartTime = 0;
        
        // Headbang animation (starts after 23s tutorial)
        this.headbangActive = false;
        this.headbangStartTime = 0;
        this.headbangAmplitudeRad = 0.0625; // ~3.6 degrees (25% increase from 0.05)
        this.headbangPeriodSec = 0.8; // 25% faster (0.8s instead of 1.0s)

        // Game objects
        this.rings = [];
        this.terrain = [];
        this.particles = [];
        
        // Controls
        this.keys = {};
        this.mouse = { x: 0, y: 0, down: false };
        
        // Duke Nukem quips
        this.quips = [
            "Hail to the king, baby!",
            "Damn, I'm good!",
            "Come get some!",
            "Time to kick ass and chew bubble gum... and I'm all out of gum.",
            "What are you waiting for? Christmas?",
            "Let's rock!",
            "I'm not gonna take this anymore!",
            "I've got balls of steel!",
            "Shake it, baby!",
            "That's gonna leave a mark!",
            "I'm the king of the world!"
        ];
        
        // Audio context for sound effects
        this.audioContext = null;
        this.backgroundMusic = null;
        this.initAudio();
        
        this.crashQuips = [
            "Damn, I'm good!",
            "That's gonna leave a mark!",
            "I'm not gonna take this anymore!",
            "Eat shit and die!",
            "You're an inspiration for birth control.",
            "I've got balls of steel!",
            "Shake it, baby!",
            "What are you waiting for? Christmas?"
        ];
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.createParticles();
        this.showScreen('splashScreen');
        
        // Debug: Check if tutorial display exists on page load
        console.log('Game initialized, checking for tutorial display...');
        const tutorialDisplay = document.getElementById('tutorialDisplay');
        if (tutorialDisplay) {
            console.log('Tutorial display found on init:', {
                id: tutorialDisplay.id,
                className: tutorialDisplay.className,
                display: window.getComputedStyle(tutorialDisplay).display,
                visibility: window.getComputedStyle(tutorialDisplay).visibility,
                opacity: window.getComputedStyle(tutorialDisplay).opacity
            });
        } else {
            console.error('Tutorial display NOT found on init!');
        }
    }
    
    initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            // Resume audio context on first user interaction
            this.resumeAudioOnInteraction();
            
            // Load background music
            this.loadBackgroundMusic();
        } catch (e) {
            console.log('Web Audio API not supported');
        }
    }
    
    loadBackgroundMusic() {
        // Test MP3 support
        const audio = new Audio();
        const canPlayMP3 = audio.canPlayType('audio/mpeg');
        console.log('MP3 support:', canPlayMP3);
        
        // Try loading music with fallback paths
        this.backgroundMusic = new Audio('music.mp3');
        console.log('Loading music from:', this.backgroundMusic.src);
        
        // Add fallback loading if first path fails
        this.backgroundMusic.addEventListener('error', () => {
            console.log('Primary path failed, trying fallback...');
            this.backgroundMusic.src = 'music.mp3'; // Try root directory
            this.backgroundMusic.load();
        }, { once: true });
        this.backgroundMusic.loop = false; // We'll handle looping manually
        this.backgroundMusic.volume = 0.3; // Lower volume so it doesn't overpower sound effects
        this.backgroundMusic.preload = 'metadata'; // Changed from 'auto' to 'metadata' for better compatibility
        
        // Handle audio loading events
        this.backgroundMusic.addEventListener('loadstart', () => {
            console.log('Background music: Loading started');
        });
        
        this.backgroundMusic.addEventListener('canplay', () => {
            console.log('Background music: Can play');
        });
        
        this.backgroundMusic.addEventListener('canplaythrough', () => {
            console.log('Background music: Can play through');
        });
        
        this.backgroundMusic.addEventListener('loadeddata', () => {
            console.log('Background music: Data loaded');
        });
        
        this.backgroundMusic.addEventListener('loadedmetadata', () => {
            console.log('Background music: Metadata loaded, duration:', this.backgroundMusic.duration);
        });
        
        this.backgroundMusic.addEventListener('error', (e) => {
            console.error('Background music failed to load:', e);
            console.error('Error details:', {
                error: e,
                networkState: this.backgroundMusic.networkState,
                readyState: this.backgroundMusic.readyState,
                src: this.backgroundMusic.src,
                mediaError: this.backgroundMusic.error,
                mediaErrorCode: this.backgroundMusic.error ? this.backgroundMusic.error.code : 'unknown',
                mediaErrorMessage: this.backgroundMusic.error ? this.getMediaErrorMessage(this.backgroundMusic.error.code) : 'unknown'
            });
            this.showMusicLoadError();
        });
        
        // Handle music end to restart from 23 seconds
        this.backgroundMusic.addEventListener('ended', () => {
            this.backgroundMusic.currentTime = 23; // Start from 23 seconds
            this.backgroundMusic.play().catch(e => {
                console.log('Background music restart failed:', e);
            });
        });
        
        // Try to load the music
        this.backgroundMusic.load();
    }
    
    getMediaErrorMessage(errorCode) {
        switch(errorCode) {
            case 1: return 'MEDIA_ERR_ABORTED: The user aborted the media operation';
            case 2: return 'MEDIA_ERR_NETWORK: A network error occurred while fetching the media';
            case 3: return 'MEDIA_ERR_DECODE: An error occurred while decoding the media';
            case 4: return 'MEDIA_ERR_SRC_NOT_SUPPORTED: The media format is not supported';
            default: return 'Unknown media error';
        }
    }

    showMusicLoadError() {
        const message = document.createElement('div');
        message.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(255, 0, 0, 0.9);
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            font-family: 'Courier New', monospace;
            text-align: center;
            z-index: 1000;
            max-width: 400px;
        `;
        message.innerHTML = `
            <strong>Music Load Error</strong><br>
            Check if music.mp3 exists and is accessible<br>
            <small>Check browser console for details</small>
        `;
        document.body.appendChild(message);
        
        setTimeout(() => {
            if (message.parentNode) {
                message.parentNode.removeChild(message);
            }
        }, 5000);
    }
    
    resumeAudioOnInteraction() {
        const resumeAudio = async () => {
            try {
                // Resume audio context
                if (this.audioContext && this.audioContext.state === 'suspended') {
                    await this.audioContext.resume();
                    console.log('Audio context resumed');
                }
                
                // Music will start when "COME GET SOME!" button is pressed
            } catch (e) {
                console.log('Audio resume failed:', e);
                // Show user-friendly message
                this.showAudioPermissionMessage();
            }
        };
        
        // Resume on any user interaction
        document.addEventListener('click', resumeAudio, { once: true });
        document.addEventListener('keydown', resumeAudio, { once: true });
        document.addEventListener('touchstart', resumeAudio, { once: true });
    }
    
    showAudioPermissionMessage() {
        // Create a temporary message for audio permission
        const message = document.createElement('div');
        message.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            color: #FFD700;
            padding: 20px;
            border: 2px solid #FFD700;
            border-radius: 10px;
            font-family: 'Courier New', monospace;
            text-align: center;
            z-index: 1000;
            max-width: 300px;
        `;
        message.innerHTML = `
            <h3>Audio Permission Required</h3>
            <p>Click anywhere to enable audio for the best experience!</p>
        `;
        document.body.appendChild(message);
        
        // Remove message after 3 seconds
        setTimeout(() => {
            if (message.parentNode) {
                message.parentNode.removeChild(message);
            }
        }, 3000);
    }
    
    playDingSound() {
        if (!this.audioContext) return;
        
        // Ensure audio context is resumed
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        // Create a pleasant "ding" sound
        oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1200, this.audioContext.currentTime + 0.1);
        oscillator.frequency.exponentialRampToValueAtTime(600, this.audioContext.currentTime + 0.3);
        
        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.3);
    }
    
    playExplosionSound() {
        console.log('playExplosionSound called');
        if (!this.audioContext) {
            console.log('No audio context available');
            return;
        }
        
        console.log('Audio context state:', this.audioContext.state);
        // Ensure audio context is resumed
        if (this.audioContext.state === 'suspended') {
            console.log('Resuming audio context');
            this.audioContext.resume();
        }
        
        // Create explosion sound using multiple oscillators and noise
        const duration = 1.5;
        const currentTime = this.audioContext.currentTime;
        
        // Low frequency rumble
        const rumbleOsc = this.audioContext.createOscillator();
        const rumbleGain = this.audioContext.createGain();
        rumbleOsc.connect(rumbleGain);
        rumbleGain.connect(this.audioContext.destination);
        
        rumbleOsc.frequency.setValueAtTime(60, currentTime);
        rumbleOsc.frequency.exponentialRampToValueAtTime(20, currentTime + duration);
        rumbleGain.gain.setValueAtTime(0.4, currentTime);
        rumbleGain.gain.exponentialRampToValueAtTime(0.01, currentTime + duration);
        
        rumbleOsc.start(currentTime);
        rumbleOsc.stop(currentTime + duration);
        
        // Mid frequency crash
        const crashOsc = this.audioContext.createOscillator();
        const crashGain = this.audioContext.createGain();
        crashOsc.connect(crashGain);
        crashGain.connect(this.audioContext.destination);
        
        crashOsc.frequency.setValueAtTime(200, currentTime);
        crashOsc.frequency.exponentialRampToValueAtTime(50, currentTime + 0.5);
        crashGain.gain.setValueAtTime(0.3, currentTime);
        crashGain.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.5);
        
        crashOsc.start(currentTime);
        crashOsc.stop(currentTime + 0.5);
        
        // High frequency sizzle
        const sizzleOsc = this.audioContext.createOscillator();
        const sizzleGain = this.audioContext.createGain();
        sizzleOsc.connect(sizzleGain);
        sizzleGain.connect(this.audioContext.destination);
        
        sizzleOsc.frequency.setValueAtTime(2000, currentTime);
        sizzleOsc.frequency.exponentialRampToValueAtTime(500, currentTime + 0.8);
        sizzleGain.gain.setValueAtTime(0.2, currentTime);
        sizzleGain.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.8);
        
        sizzleOsc.start(currentTime);
        sizzleOsc.stop(currentTime + 0.8);
        
        // White noise burst for initial impact
        const bufferSize = this.audioContext.sampleRate * 0.3; // 0.3 seconds of noise
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1; // White noise
        }
        
        const noiseSource = this.audioContext.createBufferSource();
        const noiseGain = this.audioContext.createGain();
        noiseSource.buffer = buffer;
        noiseSource.connect(noiseGain);
        noiseGain.connect(this.audioContext.destination);
        
        noiseGain.gain.setValueAtTime(0.3, currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.3);
        
        noiseSource.start(currentTime);
        
        console.log('Explosion sound played');
    }
    
    setupEventListeners() {
        // Button events
        document.getElementById('startButton').addEventListener('click', () => this.startGameWithAudio());
        document.getElementById('restartButton').addEventListener('click', () => this.startGame());
        document.getElementById('menuButton').addEventListener('click', () => this.showScreen('splashScreen'));
        
        // Keyboard events
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            e.preventDefault();
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        // Mouse events
        this.canvas = document.getElementById('gameCanvas');
        this.canvas.addEventListener('mousedown', (e) => {
            this.mouse.down = true;
            this.updateMousePosition(e);
        });
        
        this.canvas.addEventListener('mouseup', () => {
            this.mouse.down = false;
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            this.updateMousePosition(e);
        });
        
        // Touch events for mobile
        this.canvas.addEventListener('touchstart', (e) => {
            this.mouse.down = true;
            this.updateTouchPosition(e);
            e.preventDefault();
        });
        
        this.canvas.addEventListener('touchend', () => {
            this.mouse.down = false;
        });
        
        this.canvas.addEventListener('touchmove', (e) => {
            this.updateTouchPosition(e);
            e.preventDefault();
        });
    }
    
    updateMousePosition(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = (e.clientX - rect.left) / rect.width * 2 - 1;
        this.mouse.y = -(e.clientY - rect.top) / rect.height * 2 + 1;
    }
    
    updateTouchPosition(e) {
        const rect = this.canvas.getBoundingClientRect();
        const touch = e.touches[0];
        this.mouse.x = (touch.clientX - rect.left) / rect.width * 2 - 1;
        this.mouse.y = -(touch.clientY - rect.top) / rect.height * 2 + 1;
    }
    
    createParticles() {
        const particlesContainer = document.getElementById('particles');
        for (let i = 0; i < 50; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.animationDelay = Math.random() * 4 + 's';
            particle.style.animationDuration = (Math.random() * 3 + 2) + 's';
            particlesContainer.appendChild(particle);
        }
    }
    
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.add('hidden');
        });
        document.getElementById(screenId).classList.remove('hidden');
    }
    
    startGameWithAudio() {
        // Enable audio first
        this.enableAudio();
        // Then start the game
        this.startGame();
    }
    
    enableAudio() {
        // Force resume audio context and start music
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume().then(() => {
                console.log('Audio context resumed via start button');
            });
        }
        
        if (this.backgroundMusic && this.backgroundMusic.paused) {
            this.backgroundMusic.play().then(() => {
                console.log('Background music started via start button');
            }).catch(e => {
                console.log('Background music failed to start:', e);
            });
        }
    }

    startGame() {
        this.gameState = 'playing';
        this.score = 0;
        this.timeLeft = 60;
        this.streak = 0;
        this.speed = 1.0;
        this.rings = [];
        this.obstacles = [];
        this.particles = [];
        
        // Reset crash state
        this.isCrashing = false;
        this.crashParticles = [];
        this.crashTime = 0;
        
        // Start tutorial mode
        this.tutorialMode = true;
        this.tutorialStartTime = Date.now();
        this.noObstaclesTime = Date.now();
        this.countdownStartTime = 0;
        this.countdownValue = 20;
        this.countdownActive = false;
        this.obstacleSpeedMultiplier = 1.0;
        
        console.log('Game started with tutorial mode:', {
            tutorialMode: this.tutorialMode,
            tutorialStartTime: this.tutorialStartTime,
            gameState: this.gameState
        });
        
        console.log("Starting game - Gav position:", this.gavPosition);
        console.log("Obstacles at start:", this.obstacles.length);
        
        this.showScreen('gameScreen');
        this.initWebGL();
        this.createGav();
        this.createTerrain();
        this.gameLoop();
        this.startTimeCountdown();
    }
    
    initWebGL() {
        // Ensure tutorial mode is initialized
        if (this.tutorialMode === undefined) {
            this.tutorialMode = true;
        }
        
        // Create Three.js scene
        this.scene = new THREE.Scene();
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 0, 5);
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: this.canvas,
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x87CEEB, 1);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Add balanced lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 0.8); // Moderate ambient
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2); // Brighter directional
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);
        
        // Add gentle fill light
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
        fillLight.position.set(-10, 5, 5);
        this.scene.add(fillLight);
        
        // Add sky with clouds
        this.createSky();
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    createSky() {
        // Create sky sphere with cloud texture
        const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
        
        // Create cloud texture canvas
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Sky gradient - black and white during tutorial, blue during normal play
        const gradient = ctx.createLinearGradient(0, 0, 0, 512);
        if (this.tutorialMode) {
            // Black and white sky for tutorial
            gradient.addColorStop(0, '#000000');  // Pure black at top
            gradient.addColorStop(0.5, '#404040'); // Dark grey in middle
            gradient.addColorStop(1, '#808080');   // Medium grey near horizon
        } else {
            // Normal blue sky
            gradient.addColorStop(0, '#0077cc');  // Deep blue zenith
            gradient.addColorStop(0.5, '#66b2ff'); // Mid sky blue
            gradient.addColorStop(1, '#cce6ff');   // Pale blue near horizon
        }
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 1024, 512);
        
        // Function to draw soft fluffy cloud shape with radial gradient
        const drawFluffyCloud = (x, y, radiusX, radiusY, baseAlpha = 0.4) => {
            const cloudGradient = ctx.createRadialGradient(x, y, radiusX * 0.2, x, y, radiusX);
            if (this.tutorialMode) {
                // Black and white clouds for tutorial
                cloudGradient.addColorStop(0, `rgba(255, 255, 255, ${baseAlpha})`);
                cloudGradient.addColorStop(0.8, 'rgba(128, 128, 128, 0)');
            } else {
                // Normal white clouds
                cloudGradient.addColorStop(0, `rgba(255, 255, 255, ${baseAlpha})`);
                cloudGradient.addColorStop(0.8, 'rgba(255, 255, 255, 0)');
            }
            
            ctx.fillStyle = cloudGradient;
            ctx.beginPath();
            ctx.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2);
            ctx.fill();
        };
        
        // Draw many smaller clouds scattering across upper and mid sky
        for (let i = 0; i < 40; i++) {
            const x = Math.random() * 1000 + 10;
            const y = Math.random() * 250 + 50; // Spread from upper to mid sky
            const radiusX = 20 + Math.random() * 15;  // Smaller cloud width (20-35px)
            const radiusY = 10 + Math.random() * 7;   // Smaller cloud height (10-17px)
            const alpha = 0.2 + Math.random() * 0.3;  // Varied transparency
            
            // Draw a base fluffy ellipse cloud
            drawFluffyCloud(x, y, radiusX, radiusY, alpha);
            
            // Add smaller overlapping parts for natural shapes
            drawFluffyCloud(x + radiusX * 0.5, y - radiusY * 0.3, radiusX * 0.5, radiusY * 0.5, alpha * 0.8);
            drawFluffyCloud(x - radiusX * 0.4, y - radiusY * 0.2, radiusX * 0.4, radiusY * 0.4, alpha * 0.7);
        }
        
        // Add even smaller and very subtle wispy clouds
        for (let i = 0; i < 30; i++) {
            const x = Math.random() * 1024;
            const y = Math.random() * 300 + 80;
            const radiusX = 8 + Math.random() * 7;  // Tiny clouds (8-15px)
            const radiusY = 4 + Math.random() * 3;
            const alpha = 0.1 + Math.random() * 0.15;
            
            drawFluffyCloud(x, y, radiusX, radiusY, alpha);
        }
        
        // Convert to texture and create sky mesh
        const skyTexture = new THREE.CanvasTexture(canvas);
        skyTexture.wrapS = THREE.ClampToEdgeWrapping;
        skyTexture.wrapT = THREE.ClampToEdgeWrapping;
        skyTexture.needsUpdate = true;
        
        const skyMaterial = new THREE.MeshBasicMaterial({ 
            map: skyTexture,
            side: THREE.BackSide,
            transparent: false
        });
        
        const sky = new THREE.Mesh(skyGeometry, skyMaterial);
        this.scene.add(sky);
    }
    
    
    
    createGav() {
        // Load head.glb model
        const loader = new GLTFLoader();
        loader.load('head.glb', (gltf) => {
            console.log('Head GLB loaded successfully');
            this.gav = gltf.scene;
            
            // Debug: Log UV information
            console.log('=== UV MAP DEBUG ===');
            let hasUV = false;
            this.gav.traverse((child) => {
                if (child.isMesh) {
                    console.log('Mesh found, checking attributes...');
                    console.log('Available attributes:', Object.keys(child.geometry.attributes));
                    
                    if (child.geometry.attributes.uv) {
                        hasUV = true;
                        const uvArray = child.geometry.attributes.uv.array;
                        
                        // Find UV bounds
                        let minU = Infinity, maxU = -Infinity;
                        let minV = Infinity, maxV = -Infinity;
                        for (let i = 0; i < uvArray.length; i += 2) {
                            minU = Math.min(minU, uvArray[i]);
                            maxU = Math.max(maxU, uvArray[i]);
                            minV = Math.min(minV, uvArray[i + 1]);
                            maxV = Math.max(maxV, uvArray[i + 1]);
                        }
                        // If bounds collapse, regenerate with spherical mapping
                        if ((maxU - minU) < 1e-6 || (maxV - minV) < 1e-6) {
                            const positions = child.geometry.attributes.position.array;
                            const regenerated = new Float32Array(child.geometry.attributes.position.count * 2);
                            for (let i = 0, j = 0; i < positions.length; i += 3, j += 2) {
                                const x = positions[i];
                                const y = positions[i + 1];
                                const z = positions[i + 2];
                                const r = Math.sqrt(x * x + y * y + z * z) || 1;
                                const u = 0.5 + Math.atan2(z, x) / (2 * Math.PI);
                                const v = 0.5 - Math.asin(Math.max(-1, Math.min(1, y / r))) / Math.PI;
                                regenerated[j] = u;
                                regenerated[j + 1] = v;
                            }
                            child.geometry.setAttribute('uv', new THREE.BufferAttribute(regenerated, 2));
                        }
                        
                    } else {
                        // Generate UV coordinates
                        child.geometry.computeBoundingBox();
                        const bbox = child.geometry.boundingBox;
                        const size = new THREE.Vector3();
                        bbox.getSize(size);
                        
                        
                        const uvArray = new Float32Array(child.geometry.attributes.position.count * 2);
                        const positions = child.geometry.attributes.position.array;
                        
                        // Check if bounding box is valid
                        if (size.x === 0 || size.y === 0 || size.z === 0 || 
                            !isFinite(size.x) || !isFinite(size.y) || !isFinite(size.z)) {
                            
                            // Fallback: generate UVs based on position ranges
                            let minX = Infinity, maxX = -Infinity;
                            let minY = Infinity, maxY = -Infinity;
                            let minZ = Infinity, maxZ = -Infinity;
                            
                            for (let i = 0; i < positions.length; i += 3) {
                                minX = Math.min(minX, positions[i]);
                                maxX = Math.max(maxX, positions[i]);
                                minY = Math.min(minY, positions[i + 1]);
                                maxY = Math.max(maxY, positions[i + 1]);
                                minZ = Math.min(minZ, positions[i + 2]);
                                maxZ = Math.max(maxZ, positions[i + 2]);
                            }
                            
                            const rangeX = maxX - minX;
                            const rangeY = maxY - minY;
                            const rangeZ = maxZ - minZ;
                            
                            
                            for (let i = 0; i < positions.length; i += 3) {
                                const x = positions[i];
                                const y = positions[i + 1];
                                const z = positions[i + 2];
                                
                                // Cylindrical mapping using calculated ranges
                                let u = (Math.atan2(z, x) + Math.PI) / (2 * Math.PI);
                                let v = rangeY > 0 ? (y - minY) / rangeY : 0.5;
                                
                                // Clamp values to 0-1 range
                                u = Math.max(0, Math.min(1, u));
                                v = Math.max(0, Math.min(1, v));
                                
                                uvArray[(i / 3) * 2] = u;
                                uvArray[(i / 3) * 2 + 1] = v;
                            }
                        } else {
                            // Use bounding box method
                            for (let i = 0; i < positions.length; i += 3) {
                                const x = positions[i];
                                const y = positions[i + 1];
                                const z = positions[i + 2];
                                
                                // Simple cylindrical UV mapping - ensure we have valid values
                                let u = (Math.atan2(z, x) + Math.PI) / (2 * Math.PI);
                                let v = (y - bbox.min.y) / size.y;
                                
                                // Clamp values to 0-1 range
                                u = Math.max(0, Math.min(1, u));
                                v = Math.max(0, Math.min(1, v));
                                
                                // Ensure we're not getting NaN or Infinity
                                if (isNaN(u) || !isFinite(u)) u = 0;
                                if (isNaN(v) || !isFinite(v)) v = 0;
                                
                                uvArray[(i / 3) * 2] = u;
                                uvArray[(i / 3) * 2 + 1] = v;
                            }
                        }
                        
                        child.geometry.setAttribute('uv', new THREE.BufferAttribute(uvArray, 2));
                        
                        // Find actual UV bounds
                        let minU = Infinity, maxU = -Infinity;
                        let minV = Infinity, maxV = -Infinity;
                        for (let i = 0; i < uvArray.length; i += 2) {
                            minU = Math.min(minU, uvArray[i]);
                            maxU = Math.max(maxU, uvArray[i]);
                            minV = Math.min(minV, uvArray[i + 1]);
                            maxV = Math.max(maxV, uvArray[i + 1]);
                        }
                        
                    }
                }
            });
            
            
            this.gav.traverse((child) => {
                if (child.isMesh) {
                    // Ensure normals exist for proper lighting
                    if (!child.geometry.attributes.normal) {
                        child.geometry.computeVertexNormals();
                    }
                    child.castShadow = true;
                    child.receiveShadow = true;
                    
                    // Store original material for color switching
                    child.userData.originalMaterial = child.material.clone();
                }
            });
            
            // Apply initial color mode
            this.updateModelColorMode();
            
            // Center the entire model as one unit and offset down by 50%
            const box = new THREE.Box3().setFromObject(this.gav);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            this.gav.position.sub(center); // Center the entire group
            this.gav.position.y -= size.y * 0.5; // Offset down by 50% of height
            
            this.gav.scale.set(0.5, 0.5, 0.5);
            this.gav.rotation.y = 0; // Reset Y rotation
            
            // Add to scene
            this.scene.add(this.gav);
            
            // Initialize mouth animation
            this.mouthAnimationTime = 0;
            this.mouthAnimationSpeed = 4.0; // 4 times per second
            
            // Initialize animation properties
            this.headSpinRotation = 0;
            this.lastSpinTime = 0;
            this.isSpinning = false;
            this.spinStartTime = 0;
            
            // Crash animation properties
            this.isCrashing = false;
            this.crashParticles = [];
            this.crashTime = 0;
            
            // Afterburner effect properties
            this.afterburnerParticles = [];
            this.afterburnerActive = false;
            
            // Start jaw animation
            this.startJawAnimation();
            
        }, (progress) => {
            console.log('Loading progress:', (progress.loaded / progress.total * 100) + '%');
        }, (error) => {
            console.error('Error loading head.glb:', error);
            // No fallback - GLB must load
        });
    }
    
    
    
    
    updateModelColorMode() {
        if (!this.gav) return;
        
        this.gav.traverse((child) => {
            if (child.isMesh && child.userData.originalMaterial) {
                if (this.tutorialMode) {
                    // Black and white mode during tutorial
                    const bwMaterial = child.userData.originalMaterial.clone();
                    bwMaterial.color.setHex(0x808080); // Grey color
                    bwMaterial.map = null; // Remove texture for pure color
                    child.material = bwMaterial;
                } else {
                    // Full color mode after tutorial
                    child.material = child.userData.originalMaterial;
                }
            }
        });
    }

    animateMouth() {
        if (!this.gav || this.tutorialMode) return; // Only animate after tutorial
        
        // Update mouth animation time
        this.mouthAnimationTime += 0.016; // ~60fps
        
        // Animate morph targets 4 times per second
        this.gav.traverse((child) => {
            if (child.isMesh && child.morphTargetInfluences) {
                // Create a smooth sine wave for mouth opening/closing
                const mouthOpen = Math.sin(this.mouthAnimationTime * this.mouthAnimationSpeed * Math.PI * 2) * 0.5 + 0.5;
                
                // Apply to all morph targets (assuming first one is mouth_open)
                for (let i = 0; i < child.morphTargetInfluences.length; i++) {
                    child.morphTargetInfluences[i] = mouthOpen;
                }
            }
        });
    }

    startJawAnimation() {
        const animateJaw = () => {
            if (this.gameState !== 'playing') return;
            
            const currentTime = Date.now() * 0.001;
            
            // Animate mouth morph targets
            this.animateMouth();
            
            // Head spin every 4 seconds
            if (currentTime - this.lastSpinTime >= 4 && !this.isSpinning) {
                this.isSpinning = true;
                this.spinStartTime = currentTime;
                this.lastSpinTime = currentTime;
                console.log('Head spinning started!');
            }
            
            // Handle slow spin animation (1 second to complete)
            if (this.isSpinning) {
                const spinProgress = (currentTime - this.spinStartTime) / 1.0; // 1 second duration
                if (spinProgress >= 1.0) {
                    // Spin complete
                    this.isSpinning = false;
                    this.headSpinRotation = Math.PI * 2; // Complete 360 degrees
                    console.log('Head spin complete!');
                } else {
                    // Animate the spin
                    this.headSpinRotation = spinProgress * Math.PI * 2;
                }
            }
            
            requestAnimationFrame(animateJaw);
        };
        animateJaw();
    }
    
    startBackgroundMusic() {
        if (this.backgroundMusic) {
            console.log('Attempting to start background music...');
            console.log('Music ready state:', this.backgroundMusic.readyState);
            console.log('Music network state:', this.backgroundMusic.networkState);
            console.log('Music src:', this.backgroundMusic.src);
            
            this.backgroundMusic.play().then(() => {
                console.log('Background music started successfully');
            }).catch(e => {
                console.error('Background music play failed:', e);
                console.error('Error details:', {
                    name: e.name,
                    message: e.message,
                    readyState: this.backgroundMusic.readyState,
                    networkState: this.backgroundMusic.networkState
                });
                // Music will start on first user interaction due to autoplay policy
            });
        } else {
            console.error('Background music object is null');
        }
    }
    
    stopBackgroundMusic() {
        if (this.backgroundMusic) {
            this.backgroundMusic.pause();
            this.backgroundMusic.currentTime = 0; // Reset to beginning
            console.log('Background music stopped and reset to beginning');
        }
    }
    
    createTerrain() {
        // Create textured ground
        const groundGeometry = new THREE.PlaneGeometry(100, 100, 50, 50);
        
        // Create a texture for the ground
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Ground color based on tutorial mode
        if (this.tutorialMode) {
            // Much lighter grey ocean at night for tutorial (50% lighter)
            ctx.fillStyle = '#7A7A7A'; // Much lighter grey base
            ctx.fillRect(0, 0, 512, 512);
            
            // Add subtle wave patterns
            ctx.strokeStyle = '#8A8A8A'; // Lighter grey for waves
            ctx.lineWidth = 1;
            for (let i = 0; i < 50; i++) {
                ctx.beginPath();
                const x = Math.random() * 512;
                const y = Math.random() * 512;
                ctx.moveTo(x, y);
                ctx.lineTo(x + Math.random() * 30 + 10, y + Math.random() * 10 - 5);
                ctx.stroke();
            }
            
            // Add darker patches for depth
            ctx.fillStyle = '#6A6A6A'; // Lighter than before
            for (let i = 0; i < 15; i++) {
                ctx.beginPath();
                ctx.arc(Math.random() * 512, Math.random() * 512, Math.random() * 25 + 10, 0, Math.PI * 2);
                ctx.fill();
            }
        } else {
            // Normal grass color for regular play
            ctx.fillStyle = '#98FB98';
            ctx.fillRect(0, 0, 512, 512);
            
            // Add speed lines
            ctx.strokeStyle = '#7CFC00';
            ctx.lineWidth = 2;
            for (let i = 0; i < 100; i++) {
                ctx.beginPath();
                const x = Math.random() * 512;
                const y = Math.random() * 512;
                ctx.moveTo(x, y);
                ctx.lineTo(x + Math.random() * 50 + 20, y + Math.random() * 20 - 10);
                ctx.stroke();
            }
            
            // Add grass texture
            ctx.strokeStyle = '#90EE90';
            ctx.lineWidth = 1;
            for (let i = 0; i < 200; i++) {
                ctx.beginPath();
                const x = Math.random() * 512;
                const y = Math.random() * 512;
                ctx.moveTo(x, y);
                ctx.lineTo(x + Math.random() * 10 + 2, y - Math.random() * 15 - 5);
                ctx.stroke();
            }
            
            // Add dirt patches
            ctx.fillStyle = '#8FBC8F';
            for (let i = 0; i < 20; i++) {
                ctx.beginPath();
                ctx.arc(Math.random() * 512, Math.random() * 512, Math.random() * 20 + 5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(10, 10);
        
        // Ground material color based on tutorial mode
        const groundColor = this.tutorialMode ? 0x7A7A7A : 0x98FB98;
        const groundMaterial = new THREE.MeshLambertMaterial({ 
            map: texture,
            color: groundColor
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -2; // Ground positioned below camera view
        ground.receiveShadow = true;
        this.scene.add(ground);
        
        // Store ground reference for animation
        this.ground = ground;
        this.groundOffset = 0;
        
        // No initial obstacles - let them spawn naturally
    }
    
    addObstacle() {
        const obstacleType = Math.random() < 0.6 ? 'building' : 'tree';
        let obstacle;
        
        if (obstacleType === 'building') {
            // Create building with windows texture
            const buildingGeometry = new THREE.BoxGeometry(
                Math.random() * 2 + 1.5,
                Math.random() * 4 + 2,
                Math.random() * 2 + 1
            );
            
            // Create windows texture
            const canvas = document.createElement('canvas');
            canvas.width = 64;
            canvas.height = 64;
            const ctx = canvas.getContext('2d');
            
            // Random building color
            const hue = Math.random() * 0.1 + 0.05; // Brownish tones
            const saturation = 0.3 + Math.random() * 0.4;
            const lightness = 0.3 + Math.random() * 0.4;
            const baseColor = new THREE.Color().setHSL(hue, saturation, lightness);
            
            // Fill with base color
            ctx.fillStyle = `hsl(${hue * 360}, ${saturation * 100}%, ${lightness * 100}%)`;
            ctx.fillRect(0, 0, 64, 64);
            
            // Add windows
            ctx.fillStyle = '#87CEEB'; // Light blue for windows
            for (let x = 4; x < 60; x += 8) {
                for (let y = 4; y < 60; y += 8) {
                    if (Math.random() > 0.3) { // 70% chance of window
                        ctx.fillRect(x, y, 4, 6);
                    }
                }
            }
            
            const texture = new THREE.CanvasTexture(canvas);
            const buildingMaterial = new THREE.MeshPhongMaterial({ 
                map: texture,
                color: baseColor
            });
            
            obstacle = new THREE.Mesh(buildingGeometry, buildingMaterial);
            obstacle.position.set(
                (Math.random() - 0.5) * 12,
                -2 + buildingGeometry.parameters.height / 2, // Bottom of building sits on ground (y = -2)
                -Math.random() * 40 - 100 // Start much further away
            );
        } else {
            // Create tree
            const trunkHeight = 2;
            const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, trunkHeight, 8);
            const trunkMaterial = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
            const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
            
            // Position trunk so its bottom sits on ground level
            trunk.position.y = trunkHeight / 2; // Lift trunk up by half its height
            
            const foliageGeometry = new THREE.SphereGeometry(1.5, 8, 6);
            const foliageMaterial = new THREE.MeshPhongMaterial({ color: 0x228B22 });
            const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
            foliage.position.y = trunkHeight + 1.5; // Position foliage on top of trunk
            
            obstacle = new THREE.Group();
            obstacle.add(trunk);
            obstacle.add(foliage);
            obstacle.position.set(
                (Math.random() - 0.5) * 12,
                -2, // Group positioned at ground level (y = -2)
                -Math.random() * 40 - 100 // Start much further away
            );
        }
        
        obstacle.userData = { 
            type: 'obstacle',
            obstacleType: obstacleType
        };
        obstacle.castShadow = true;
        this.scene.add(obstacle);
        this.obstacles.push(obstacle);
    }
    
    addRing() {
        const ringGeometry = new THREE.TorusGeometry(2, 0.2, 8, 16); // Doubled size: radius 2, thickness 0.2
        
        // Black rings during tutorial, green during normal play
        let ringColor, emissiveColor;
        if (this.tutorialMode) {
            ringColor = 0x000000; // Black
            emissiveColor = 0x000000; // Black emissive
        } else {
            ringColor = 0x228B22; // Dark green like Flappy Bird pipes
            emissiveColor = 0x006600;
        }
        
        const ringMaterial = new THREE.MeshPhongMaterial({ 
            color: ringColor,
            emissive: emissiveColor,
            transparent: true,
            opacity: 0.9
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        
        ring.position.set(
            (Math.random() - 0.5) * 8,
            Math.random() * 3 + 1, // Always above ground level (y = 1 to 4)
            -Math.random() * 30 - 100 // Start much further away
        );
        
        ring.userData = { 
            type: 'ring',
            collected: false,
            timeValue: 5
        };
        
        this.scene.add(ring);
        this.rings.push(ring);
    }
    
    updateControls() {
        const moveSpeed = 0.04; // Reduced by 60% from 0.1 to 0.04
        
        // Keyboard controls
        if (this.keys['KeyW'] || this.keys['ArrowUp']) {
            this.gavVelocity.y += moveSpeed;
        }
        if (this.keys['KeyS'] || this.keys['ArrowDown']) {
            this.gavVelocity.y -= moveSpeed;
        }
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) {
            this.gavVelocity.x -= moveSpeed;
        }
        if (this.keys['KeyD'] || this.keys['ArrowRight']) {
            this.gavVelocity.x += moveSpeed;
        }
        
        // Mouse/touch controls
        if (this.mouse.down) {
            this.gavVelocity.x = this.mouse.x * 0.8; // Reduced sensitivity
            this.gavVelocity.y = this.mouse.y * 0.8;
        }
        
        // Apply velocity with damping
        this.gavPosition.x += this.gavVelocity.x;
        this.gavPosition.y += this.gavVelocity.y;
        this.gavVelocity.x *= 0.9;
        this.gavVelocity.y *= 0.9;
        
        // Constrain movement (altitude system: ground at y = -2, so altitude = y + 2)
        this.gavPosition.x = Math.max(-4, Math.min(4, this.gavPosition.x));
        this.gavPosition.y = Math.max(-0.4, Math.min(3.5, this.gavPosition.y)); // Altitude 1.6 to 5.5 (y = -0.4 to 3.5)
        
        // Check ground collision (ground is at y = -2, altitude 0 = y = -2)
        // Account for head radius - head bottom is at gavPosition.y - 0.6
        const headBottom = this.gavPosition.y - 0.6;
        if (headBottom < -2) { // Prevent head bottom from going below ground level
            this.gavPosition.y = -2 + 0.6; // Clamp so head bottom touches ground
        }
        
        // Update Gav position (only if gav exists)
        if (this.gav && this.gav.position) {
            this.gav.position.set(this.gavPosition.x, this.gavPosition.y, this.gavPosition.z);
        }
        
        // Add some rotation based on movement (but preserve head spin)
        if (this.gav && this.gav.rotation) {
            // Base rotations from input
            let rotY = this.gavVelocity.x * 0.5;
            let rotX = -this.gavVelocity.y * 0.3;

            // Headbang after tutorial ends: small X-axis oscillation
            if (this.headbangActive && !this.tutorialMode) {
                const tSec = (Date.now() - this.headbangStartTime) / 1000;
                const omega = (2 * Math.PI) / this.headbangPeriodSec;
                rotX += Math.sin(tSec * omega) * this.headbangAmplitudeRad;
            }

            this.gav.rotation.y = rotY;
            this.gav.rotation.x = rotX;
            this.gav.rotation.z = this.headSpinRotation; // Z-axis spin only
        }
        
        // Debug: Log rotation occasionally
        if (Math.random() < 0.01 && this.gav && this.gav.rotation) { // 1% chance per frame
            console.log('Head rotation Y:', this.gav.rotation.y, 'Head spin:', this.headSpinRotation);
        }
    }
    
    updateRings() {
        // Move rings towards camera (10x faster)
        this.rings.forEach(ring => {
            ring.position.z += 1.0 * this.speed;
            
            // Check collision
            if (!ring.userData.collected) {
                const distance = this.gav.position.distanceTo(ring.position);
                if (distance < 2.5) { // Increased collision radius for larger rings
                    this.collectRing(ring);
                }
            }
            
            // Remove rings that are behind camera
            if (ring.position.z > 5) {
                this.scene.remove(ring);
                this.rings.splice(this.rings.indexOf(ring), 1);
            }
        });
        
        // Add new rings (one every 10 seconds - reduced by 50%)
        // Rings spawn immediately from game start
        if (Math.random() < 0.005 * this.speed) {
            this.addRing();
        }
    }
    
    collectRing(ring) {
        ring.userData.collected = true;
        this.scene.remove(ring);
        this.rings.splice(this.rings.indexOf(ring), 1);
        
        // Add score and time
        this.score += 100;
        this.timeLeft += ring.userData.timeValue;
        this.streak++;
        
        // Play ding sound
        this.playDingSound();
        
        // Show quip
        this.showQuip();
        
        // Increase speed
        this.speed += 0.01;
    }
    
    showQuip() {
        const quipElement = document.getElementById('gavQuips');
        const randomQuip = this.quips[Math.floor(Math.random() * this.quips.length)];
        
        quipElement.textContent = randomQuip;
        quipElement.classList.add('show');
        
        setTimeout(() => {
            quipElement.classList.remove('show');
        }, 2000);
    }
    
    updateTerrain() {
        // Animate ground texture for speed effect
        if (this.ground && this.ground.material.map) {
            this.groundOffset += 0.1 * this.speed * this.obstacleSpeedMultiplier;
            this.ground.material.map.offset.set(0, this.groundOffset);
        }
        
        // Move obstacles towards camera (10x faster)
        this.obstacles.forEach(obstacle => {
            obstacle.position.z += 1.0 * this.speed * this.obstacleSpeedMultiplier;
            
            // Check collision
            const distance = this.gav.position.distanceTo(obstacle.position);
            if (distance < 1.2) {
                console.log(`COLLISION! Distance: ${distance.toFixed(2)}, Gav pos: (${this.gav.position.x.toFixed(2)}, ${this.gav.position.y.toFixed(2)}, ${this.gav.position.z.toFixed(2)}), Obstacle pos: (${obstacle.position.x.toFixed(2)}, ${obstacle.position.y.toFixed(2)}, ${obstacle.position.z.toFixed(2)})`);
                
                // Stop music immediately on collision
                this.stopBackgroundMusic();
                
                // Play explosion sound effect
                console.log('About to play explosion sound...');
                this.playExplosionSound();
                
                this.startCrashAnimation();
            }
            
            // Remove obstacles that are behind camera
            if (obstacle.position.z > 5) {
                this.scene.remove(obstacle);
                this.obstacles.splice(this.obstacles.indexOf(obstacle), 1);
            }
        });
        
        // Add new obstacles (one every 10 seconds - reduced by 50%)
        // But not during the first 23 seconds (tutorial period)
        const tutorialElapsed = (Date.now() - this.tutorialStartTime) / 1000;
        if (tutorialElapsed >= 23 && Math.random() < 0.005 * this.speed) {
            this.addObstacle();
        }
    }
    
    startTimeCountdown() {
        const countdown = setInterval(() => {
            if (this.gameState !== 'playing') {
                clearInterval(countdown);
                return;
            }
            
            this.timeLeft -= 0.1;
            if (this.timeLeft <= 0) {
                this.gameOver();
                clearInterval(countdown);
            }
        }, 100);
    }
    
    startCrashAnimation() {
        if (this.isCrashing) return; // Prevent multiple crash triggers
        
        this.isCrashing = true;
        this.crashTime = 0;
        
        // Create explosion particles
        this.createCrashExplosion();
        
        // Start crash animation loop
        this.animateCrash();
    }
    
    createAfterburnerFlash() {
        console.log('Creating afterburner flash effect!');
        this.afterburnerActive = true;
        
        // Create bright orange and blue afterburner particles
        for (let i = 0; i < 50; i++) {
            const particleGeometry = new THREE.SphereGeometry(0.025, 8, 8); // 50% smaller particles
            
            // Alternate between bright orange and bright blue
            const isOrange = i % 2 === 0;
            const particleMaterial = new THREE.MeshBasicMaterial({ 
                color: isOrange ? 0xFFCC00 : 0x00EEFF, // Much brighter orange and cyan
                emissive: isOrange ? 0xFF6600 : 0x0088FF, // Add emissive glow
                transparent: true,
                opacity: 1.0 // Full opacity for brighter effect
            });
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            
            // Position behind Gav's head (afterburner plume)
            const angle = (i / 50) * Math.PI * 2; // Spread in circle
            const radius = Math.random() * 0.8 + 0.2;
            particle.position.set(
                this.gav.position.x + Math.cos(angle) * radius * 0.3,
                this.gav.position.y + Math.sin(angle) * radius * 0.3,
                this.gav.position.z - Math.random() * 2 - 0.5 // Behind the head
            );
            
            // Velocity for jet plume effect (super high speed streaming towards camera)
            particle.userData = {
                velocity: new THREE.Vector3(
                    Math.cos(angle) * 0.5, // 5x faster radial spread
                    Math.sin(angle) * 0.5, // 5x faster radial spread
                    Math.random() * 4 + 2 // Super high forward velocity towards camera (positive Z)
                ),
                life: 1.0,
                decay: 0.05, // Faster decay for quick streaks
                initialScale: Math.random() * 0.5 + 0.5
            };
            
            this.scene.add(particle);
            this.afterburnerParticles.push(particle);
        }
        
        // Keep afterburner active for the rest of the game
        // (removed auto-disable)
    }

    createCrashExplosion() {
        // Create explosion particles
        for (let i = 0; i < 20; i++) {
            const particleGeometry = new THREE.SphereGeometry(0.05, 4, 4);
            const particleMaterial = new THREE.MeshBasicMaterial({ 
                color: new THREE.Color().setHSL(Math.random() * 0.1, 1, 0.5) // Orange/red colors
            });
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            
            // Position at Gav's location
            particle.position.set(
                this.gav.position.x + (Math.random() - 0.5) * 0.5,
                this.gav.position.y + (Math.random() - 0.5) * 0.5,
                this.gav.position.z + (Math.random() - 0.5) * 0.5
            );
            
            // Random velocity for explosion effect
            particle.userData = {
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.3,
                    (Math.random() - 0.5) * 0.3,
                    (Math.random() - 0.5) * 0.3
                ),
                life: 1.0,
                decay: 0.02
            };
            
            this.scene.add(particle);
            this.crashParticles.push(particle);
        }
    }
    
    animateCrash() {
        if (!this.isCrashing) return;
        
        this.crashTime += 0.016; // ~60fps
        
        // Animate Gav falling and spinning
        this.gav.position.y += 0.1; // Fall down
        this.gav.rotation.z += 0.2; // Spin while falling
        this.gav.rotation.x += 0.1;
        
        // Update explosion particles
        if (!this.crashParticles) {
            this.crashParticles = [];
        }
        this.crashParticles.forEach((particle, index) => {
            if (particle.userData.life > 0) {
                // Move particle
                particle.position.add(particle.userData.velocity);
                
                // Apply gravity
                particle.userData.velocity.y -= 0.01;
                
                // Fade out
                particle.userData.life -= particle.userData.decay;
                particle.material.opacity = particle.userData.life;
                
                // Scale down
                const scale = particle.userData.life;
                particle.scale.set(scale, scale, scale);
            } else {
                // Remove dead particles
                this.scene.remove(particle);
                this.crashParticles.splice(index, 1);
            }
        });
        
        // End crash animation after 2 seconds
        if (this.crashTime > 2.0) {
            this.gameOver();
        } else {
            requestAnimationFrame(() => this.animateCrash());
        }
    }
    
    updateAfterburnerParticles() {
        // Initialize if not exists
        if (!this.afterburnerParticles) {
            this.afterburnerParticles = [];
        }
        
        // Update existing afterburner particles
        this.afterburnerParticles.forEach((particle, index) => {
            if (particle.userData.life > 0) {
                // Move particle
                particle.position.add(particle.userData.velocity);
                
                // Apply gravity and drag
                particle.userData.velocity.y -= 0.02; // Slight gravity
                particle.userData.velocity.multiplyScalar(0.98); // Drag
                
                // Fade out
                particle.userData.life -= particle.userData.decay;
                particle.material.opacity = particle.userData.life;
                
                // Scale effect
                const scale = particle.userData.life * particle.userData.initialScale;
                particle.scale.set(scale, scale, scale);
            } else {
                // Remove dead particles
                this.scene.remove(particle);
                this.afterburnerParticles.splice(index, 1);
            }
        });
        
        // Create new particles if afterburner is active
        if (this.afterburnerActive && this.afterburnerParticles.length < 100) {
            // Add 2-3 new particles per frame for continuous stream
            for (let i = 0; i < 3; i++) {
                const particleGeometry = new THREE.SphereGeometry(0.025, 8, 8); // 50% smaller particles
                
                const isOrange = Math.random() > 0.5;
                const particleMaterial = new THREE.MeshBasicMaterial({ 
                    color: isOrange ? 0xFFAA00 : 0x00DDFF, // Even brighter colors
                    transparent: true,
                    opacity: 1.0
                });
                const particle = new THREE.Mesh(particleGeometry, particleMaterial);
                
                // Position behind Gav's head
                const angle = Math.random() * Math.PI * 2;
                const radius = Math.random() * 0.3 + 0.1;
                particle.position.set(
                    this.gav.position.x + Math.cos(angle) * radius,
                    this.gav.position.y + Math.sin(angle) * radius,
                    this.gav.position.z - Math.random() * 0.5 - 0.2
                );
                
                // High-speed velocity towards camera
                particle.userData = {
                    velocity: new THREE.Vector3(
                        Math.cos(angle) * (Math.random() * 0.3 + 0.2),
                        Math.sin(angle) * (Math.random() * 0.3 + 0.2),
                        Math.random() * 3 + 1.5 // Super fast forward towards camera (positive Z)
                    ),
                    life: 1.0,
                    decay: 0.04,
                    initialScale: Math.random() * 0.8 + 0.5
                };
                
                this.scene.add(particle);
                this.afterburnerParticles.push(particle);
            }
        }
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        
        // Stop background music and reset to beginning
        this.stopBackgroundMusic();
        
        // Reset all game state to initial values
        this.score = 0;
        this.timeLeft = 60;
        this.streak = 0;
        this.speed = 1.0;
        
        // Reset tutorial mode
        this.tutorialMode = true;
        this.tutorialStartTime = 0;
        this.noObstaclesTime = 0;
        this.countdownStartTime = 0;
        this.countdownValue = 20;
        this.countdownActive = false;
        this.obstacleSpeedMultiplier = 1.0;
        
        // Reset crash state
        this.isCrashing = false;
        this.crashParticles = [];
        this.crashTime = 0;
        
        // Reset afterburner state
        this.afterburnerActive = false;
        this.afterburnerParticles = [];
        
        // Clear all game objects from scene and arrays
        if (this.rings) this.rings.forEach(ring => this.scene.remove(ring));
        if (this.obstacles) this.obstacles.forEach(obstacle => this.scene.remove(obstacle));
        if (this.crashParticles) this.crashParticles.forEach(particle => this.scene.remove(particle));
        if (this.afterburnerParticles) this.afterburnerParticles.forEach(particle => this.scene.remove(particle));
        
        this.rings = [];
        this.obstacles = [];
        this.particles = [];
        this.crashParticles = [];
        this.afterburnerParticles = [];
        
        // Reset Gav position
        this.gavPosition = { x: 0, y: 0, z: 0 }; // Altitude 2.0 = y = 0
        this.gavVelocity = { x: 0, y: 0, z: 0 };
        this.gavRotation = { x: 0, y: 0, z: 0 };
        
        // Reset head spin animation
        this.headSpinRotation = 0;
        this.lastSpinTime = 0;
        this.isSpinning = false;
        this.spinStartTime = 0;
        
        // Hide tutorial display
        const tutorialDisplay = document.getElementById('tutorialDisplay');
        if (tutorialDisplay) {
            tutorialDisplay.classList.add('hidden');
        }
        
        // Show final quip
        const finalQuip = this.crashQuips[Math.floor(Math.random() * this.crashQuips.length)];
        document.getElementById('finalQuip').textContent = finalQuip;
        document.getElementById('finalScore').textContent = this.score;
        
        this.showScreen('gameOverScreen');
    }
    
    updateHUD() {
        document.getElementById('timeDisplay').textContent = Math.ceil(this.timeLeft);
        document.getElementById('scoreDisplay').textContent = this.score;
        document.getElementById('streakDisplay').textContent = this.streak;
        
        // Debug: Calculate distance to nearest obstacle
        let nearestDistance = Infinity;
        this.obstacles.forEach(obstacle => {
            const distance = this.gav.position.distanceTo(obstacle.position);
            if (distance < nearestDistance) {
                nearestDistance = distance;
            }
        });
        
        if (nearestDistance === Infinity) {
            document.getElementById('debugDisplay').textContent = 'No obstacles';
        } else {
            document.getElementById('debugDisplay').textContent = nearestDistance.toFixed(2);
        }
        
        // Calculate Gavitude (altitude above ground)
        // Ground is at y = -2, so altitude = gavPosition.y - (-2) = gavPosition.y + 2
        const gavitude = this.gavPosition.y + 2;
        document.getElementById('gavitudeDisplay').textContent = gavitude.toFixed(2);
    }
    
    gameLoop() {
        if (this.gameState !== 'playing') return;
        
        // Check tutorial mode
        if (this.tutorialMode) {
            const tutorialElapsed = (Date.now() - this.tutorialStartTime) / 1000;
            
            console.log('Tutorial mode active:', {
                tutorialElapsed: tutorialElapsed.toFixed(2),
                tutorialStartTime: this.tutorialStartTime,
                currentTime: Date.now(),
                countdownActive: this.countdownActive,
                gameState: this.gameState
            });
            
            // Start countdown after 3 seconds
            if (tutorialElapsed >= 3 && !this.countdownActive) {
                this.countdownActive = true;
                this.countdownStartTime = Date.now();
                this.countdownValue = 20;
                console.log('Countdown activated at', tutorialElapsed.toFixed(2), 'seconds');
            }
            
            // Show tutorial display
            const tutorialDisplay = document.getElementById('tutorialDisplay');
            if (tutorialDisplay) {
                console.log('Tutorial display found, current classes:', tutorialDisplay.className);
                console.log('Tutorial display style.display:', tutorialDisplay.style.display);
                console.log('Tutorial display computed style:', window.getComputedStyle(tutorialDisplay).display);
                tutorialDisplay.classList.remove('hidden');
                console.log('After removing hidden class:', tutorialDisplay.className);
            } else {
                console.error('Tutorial display element not found! Available elements with tutorial in ID:');
                const allElements = document.querySelectorAll('[id*="tutorial"]');
                allElements.forEach(el => console.log('Found:', el.id, el.tagName, el.className));
            }
            
            // Update countdown if active
            if (this.countdownActive) {
                const countdownElapsed = (Date.now() - this.countdownStartTime) / 1000;
                this.countdownValue = Math.max(0, 20 - Math.floor(countdownElapsed));
                
                // Update countdown display in tutorial section
                const countdownElement = document.getElementById('tutorialCountdown');
                if (countdownElement) {
                    countdownElement.textContent = this.countdownValue;
                } else {
                    console.error('Tutorial countdown element not found!');
                }
            }
            
            if (tutorialElapsed >= 23) {
                // End tutorial mode
                this.tutorialMode = false;
                // Hide tutorial display
                if (tutorialDisplay) {
                    tutorialDisplay.classList.add('hidden');
                }
                // Trigger afterburner flash effect
                this.createAfterburnerFlash();
                // Increase speed by 15% after tutorial (reduced from 20%)
                this.speed *= 1.15;
                // Increase obstacle speed by 20% more (reduced from 50%)
                this.obstacleSpeedMultiplier = 1.2;
                console.log('Tutorial ended - Speed increased to:', this.speed);
                console.log('Obstacle speed multiplier increased to:', this.obstacleSpeedMultiplier);
                // Recreate sky and terrain for normal mode
                this.createSky();
                this.createTerrain();
                
                // Update model to full color mode
                this.updateModelColorMode();

                // Start headbanging
                if (!this.headbangActive) {
                    this.headbangActive = true;
                    this.headbangStartTime = Date.now();
                }
            }
        }
        
        // Only update normal gameplay if not crashing
        if (!this.isCrashing) {
            this.updateControls();
            this.updateRings();
            this.updateTerrain();
        }
        
        // Update afterburner particles
        this.updateAfterburnerParticles();
        
        this.updateHUD();
        
        // Render
        this.renderer.render(this.scene, this.camera);
        
        requestAnimationFrame(() => this.gameLoop());
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.game = new FlappyGavGame();
});