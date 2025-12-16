import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';

declare global {
  interface Window {
    Hands: any;
    Camera: any;
  }
}

const DEFAULT_IMAGE_PATH = 'https://github.com/Asianboyneo/Asian-Boy/blob/main/287069905_564270111773809_6459526836966162411_n.jpg?raw=true';

export default function AsianBoyUniverse() {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const musicBtnRef = useRef<HTMLButtonElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const explodeBtnRef = useRef<HTMLButtonElement>(null);
  const modeBtnRef = useRef<HTMLButtonElement>(null);
  const resetBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer;
    let composer: EffectComposer, controls: OrbitControls;
    let particles: THREE.Points, geometry: THREE.BufferGeometry, material: THREE.ShaderMaterial;
    let imagePlane: THREE.Mesh;
    const clock = new THREE.Clock();
    let time = 0;
    let currentImageData: any = null;
    let cameraUtils: any;
    let isCameraActive = false;
    let isIntroAnimation = true;
    let isPhotoMode = false;
    let manualExplosionStrength = 0;
    let isHoldingExplode = false;
    let handPresent = false;
    let targetRotationX = 0;
    let targetRotationY = 0;
    let targetCameraZ = 150;
    let pinchStrength = 0;
    let animationId: number;
    let gui: GUI;

    const params = {
      count: 80000,
      size: 306,
      opacity: 1.0,
      bloomStrength: 3.0,
      depthStrength: 60.0,
      floating: true,
      floatSpeed: 3.0,
      toggleCamera: function() {
        if (!cameraUtils) return;
        const statusDot = document.getElementById('cam-status');
        const statusText = document.getElementById('status-text');
        const instructions = document.getElementById('gesture-instructions');

        if (isCameraActive) {
          cameraUtils.stop();
          isCameraActive = false;
          handPresent = false;

          if (statusDot) statusDot.className = 'status-dot status-inactive';
          if (statusText) statusText.textContent = "Sensors Offline";
          if (instructions) instructions.style.display = 'none';
        } else {
          cameraUtils.start().then(() => {
            isCameraActive = true;
            if (statusDot) statusDot.className = 'status-dot status-active';
            if (statusText) statusText.textContent = "Sensors Active";
            if (instructions) instructions.style.display = 'block';
          });
          if (statusDot) statusDot.className = 'status-dot';
          if (statusText) statusText.textContent = "Initializing...";
        }
      },
      uploadPhoto: function() {
        if (fileInputRef.current) fileInputRef.current.click();
      },
      resetView: function() {
        targetRotationX = 0;
        targetRotationY = 0;
        targetCameraZ = 150;

        if (particles) particles.rotation.set(0, 0, 0);

        setRandomLaunchPosition();

        if (controls) {
          controls.enabled = false;
          controls.target.set(0, 0, 0);
        }

        isIntroAnimation = true;
        playMusic(true);
      }
    };

    function playMusic(restart = false) {
      const audio = audioRef.current;
      const musicBtn = musicBtnRef.current;

      if (audio) {
        if (restart) {
          audio.currentTime = 0;
        }

        const playPromise = audio.play();

        if (playPromise !== undefined) {
          playPromise.then(_ => {
            if (musicBtn) {
              musicBtn.innerHTML = '<i class="fas fa-music"></i>';
              musicBtn.classList.add('active-music');
            }
          })
            .catch(error => {
              console.log("Autoplay prevented:", error);
              if (musicBtn) {
                musicBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
                musicBtn.classList.remove('active-music');
              }
            });
        }
      }
    }

    function setRandomLaunchPosition() {
      if (!camera) return;
      const r = 2000 + Math.random() * 1000;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      camera.position.x = r * Math.sin(phi) * Math.cos(theta);
      camera.position.y = r * Math.sin(phi) * Math.sin(theta);
      camera.position.z = r * Math.cos(phi);
      camera.lookAt(0, 0, 0);
    }

    function init() {
      if (!containerRef.current) return;
      const container = containerRef.current;

      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x020205);
      scene.fog = new THREE.FogExp2(0x020205, 0.0015);

      camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 20000);
      camera.position.set(0, 0, 150);
      camera.lookAt(0, 0, 0);

      renderer = new THREE.WebGLRenderer({
        antialias: false,
        powerPreference: "high-performance",
        alpha: false
      });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ReinhardToneMapping;
      container.appendChild(renderer.domElement);

      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.autoRotate = false;
      controls.maxPolarAngle = Math.PI * 0.75;
      controls.minPolarAngle = Math.PI * 0.25;
      // @ts-ignore
      controls.enableTouch = true;
      controls.saveState();

      loadDefaultImage();

      const renderScene = new RenderPass(scene, camera);
      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth / window.innerHeight / 2, window.innerHeight / 2),
        1.5, 0.4, 0.85
      );
      bloomPass.strength = params.bloomStrength;
      bloomPass.radius = 0.5;
      bloomPass.threshold = 0.1;

      composer = new EffectComposer(renderer);
      composer.addPass(renderScene);
      composer.addPass(bloomPass);
      // @ts-ignore
      composer.bloomPass = bloomPass;

      setRandomLaunchPosition();
      controls.enabled = false;

      window.addEventListener('resize', onWindowResize);

      setTimeout(() => {
        const loading = document.getElementById('loading');
        if (loading) loading.style.opacity = '0';
      }, 1500);

      playMusic();
    }

    function loadDefaultImage() {
      const statusText = document.getElementById('status-text');
      if (statusText) statusText.textContent = "Loading Default Image...";

      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = function() {
        console.log("Default image loaded successfully.");
        processImageToParticles(img, true);
        if (statusText) statusText.textContent = "Camera Standby";
      };
      img.onerror = function() {
        console.warn("Could not load default image. Falling back to default galaxy.");
        generateParticles(params.count);
        if (statusText) statusText.textContent = "Camera Standby";
      };
      img.src = DEFAULT_IMAGE_PATH;
    }

    function processImageToParticles(img: HTMLImageElement, isInit = false) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const maxSize = 400;
      let w = img.width;
      let h = img.height;
      if (w > h && w > maxSize) {
        h = Math.round(h * (maxSize / w));
        w = maxSize;
      } else if (h > maxSize) {
        w = Math.round(w * (maxSize / h));
        h = maxSize;
      }

      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);

      const imageData = ctx.getImageData(0, 0, w, h);

      currentImageData = {
        width: w,
        height: h,
        data: imageData.data,
        aspectRatio: img.width / img.height
      };

      generateParticles(params.count, currentImageData);

      const displayWidth = 100;
      const displayHeight = 100;
      let finalWidth, finalHeight;
      if (currentImageData.aspectRatio >= 1) {
        finalWidth = displayWidth;
        finalHeight = displayWidth / currentImageData.aspectRatio;
      } else {
        finalWidth = displayHeight * currentImageData.aspectRatio;
        finalHeight = displayHeight;
      }

      if (imagePlane) {
        scene.remove(imagePlane);
        imagePlane.geometry.dispose();
        
        const materials = Array.isArray(imagePlane.material) ? imagePlane.material : [imagePlane.material];
        materials.forEach(m => {
          if ((m as any).map) (m as any).map.dispose();
          m.dispose();
        });
      }

      const texture = new THREE.Texture(img);
      texture.needsUpdate = true;
      texture.colorSpace = THREE.SRGBColorSpace;

      const planeGeometry = new THREE.PlaneGeometry(finalWidth, finalHeight);
      const planeMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide
      });

      imagePlane = new THREE.Mesh(planeGeometry, planeMaterial);
      imagePlane.visible = isPhotoMode;
      scene.add(imagePlane);

      if (particles) particles.visible = !isPhotoMode;

      if (!isInit) {
        setRandomLaunchPosition();

        if (particles) particles.rotation.set(0, 0, 0);
        targetRotationX = 0;
        targetRotationY = 0;

        controls.enabled = false;
        controls.target.set(0, 0, 0);

        isIntroAnimation = true;
        playMusic(true);
      }
    }

    function initUI() {
      const resetBtn = resetBtnRef.current;
      if (resetBtn) {
        resetBtn.addEventListener('click', (e) => {
          e.preventDefault();
          params.resetView();
          resetBtn.blur();
        });
      }

      const explodeBtn = explodeBtnRef.current;
      const startExplode = (e: any) => {
        if (e.cancelable && e.type === 'touchstart') e.preventDefault();
        if (isPhotoMode) {
          const modeBtn = modeBtnRef.current;
          if (modeBtn) modeBtn.click();
        }
        isHoldingExplode = true;
      };

      const endExplode = () => {
        isHoldingExplode = false;
        if (explodeBtn) explodeBtn.blur();
      };

      if (explodeBtn) {
        explodeBtn.addEventListener('mousedown', startExplode);
        explodeBtn.addEventListener('touchstart', startExplode, { passive: false });
        window.addEventListener('mouseup', endExplode);
        window.addEventListener('touchend', endExplode);
        window.addEventListener('mouseleave', endExplode);
      }

      const musicBtn = musicBtnRef.current;
      const audio = audioRef.current;

      if (audio) {
        audio.addEventListener('ended', () => {
          if (musicBtn) {
            musicBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
            musicBtn.classList.remove('active-music');
          }
        });
      }

      if (musicBtn) {
        musicBtn.addEventListener('click', (e) => {
          e.preventDefault();
          if (audio) {
            if (audio.paused) {
              playMusic();
            } else {
              audio.pause();
              musicBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
              musicBtn.classList.remove('active-music');
            }
          }
          musicBtn.blur();
        });
      }

      const modeBtn = modeBtnRef.current;
      if (modeBtn) {
        modeBtn.addEventListener('click', (e) => {
          e.preventDefault();
          isPhotoMode = !isPhotoMode;

          if (isPhotoMode) {
            modeBtn.innerHTML = '<i class="fas fa-cubes"></i> Particle Mode';
            modeBtn.classList.add('active-photo');

            if (particles) particles.visible = false;
            if (imagePlane) imagePlane.visible = true;
            if (composer && (composer as any).bloomPass) (composer as any).bloomPass.strength = 0.2;
          } else {
            modeBtn.innerHTML = '<i class="fas fa-image"></i> Photo Mode';
            modeBtn.classList.remove('active-photo');

            if (particles) particles.visible = true;
            if (imagePlane) imagePlane.visible = false;
            if (composer && (composer as any).bloomPass) (composer as any).bloomPass.strength = params.bloomStrength;
          }

          modeBtn.blur();
        });
      }

      gui = new GUI({ title: 'Control Center' });
      if (window.innerWidth < 600) gui.close();

      const folder1 = gui.addFolder('Input Source');
      folder1.add(params, 'toggleCamera').name('👁️ Hand Tracking');
      folder1.add(params, 'uploadPhoto').name('📷 Upload Image');

      folder1.add(params, 'floating').name('🌊 Auto Float');
      folder1.add(params, 'floatSpeed', 0.1, 5.0).name('Float Speed');

      folder1.add(params, 'depthStrength', 0, 100).name('3D Depth').onChange(val => {
        if (currentImageData) generateParticles(params.count, currentImageData);
      });

      const folder2 = gui.addFolder('Particle System');
      folder2.add(params, 'count', 5000, 80000, 5000).name('Density').onFinishChange(val => {
        generateParticles(val, currentImageData);
      });

      folder2.add(params, 'size', 10, 1000).name('Size').onChange(val => {
        if (material) material.uniforms.uSize.value = val;
      });

      folder2.add(params, 'opacity', 0.1, 1.0).name('Opacity').onChange(val => {
        if (material) material.uniforms.uOpacity.value = val;
      });

      folder2.add(params, 'bloomStrength', 0, 3).name('Glow Intensity').onChange(val => {
        params.bloomStrength = val;
        if (!isPhotoMode && composer && (composer as any).bloomPass) {
          (composer as any).bloomPass.strength = val;
        }
      });
    }

    function initFileUpload() {
      const fileInput = fileInputRef.current;
      if (fileInput) {
        fileInput.addEventListener('change', function(e: any) {
          const file = e.target.files[0];
          if (!file) return;

          const reader = new FileReader();
          reader.onload = function(event: any) {
            const img = new Image();
            img.onload = function() {
              processImageToParticles(img, false);
            };
            img.src = event.target.result;
          };
          reader.readAsDataURL(file);
          this.value = '';
        });
      }
    }

    function generateParticles(count: number, imgData: any = null) {
      if (particles) {
        scene.remove(particles);
        particles.geometry.dispose();
      }

      geometry = new THREE.BufferGeometry();
      const positions = [];
      const colors = [];
      const sizes = [];
      const randomness = [];

      const displayWidth = 100;
      const displayHeight = 100;

      if (imgData) {
        let finalWidth, finalHeight;
        if (imgData.aspectRatio >= 1) {
          finalWidth = displayWidth;
          finalHeight = displayWidth / imgData.aspectRatio;
        } else {
          finalWidth = displayHeight * imgData.aspectRatio;
          finalHeight = displayHeight;
        }

        const data = imgData.data;
        const w = imgData.width;
        const h = imgData.height;

        for (let i = 0; i < count; i++) {
          const px = Math.floor(Math.random() * w);
          const py = Math.floor(Math.random() * h);

          const index = (py * w + px) * 4;

          const r = data[index] / 255;
          const g = data[index + 1] / 255;
          const b = data[index + 2] / 255;
          const a = data[index + 3];

          if (a < 20 || (r + g + b) < 0.05) {
            colors.push(0, 0, 0);
          } else {
            colors.push(r, g, b);
          }

          const u = (px / w) - 0.5;
          const v = (py / h) - 0.5;

          const x = u * finalWidth;
          const y = -v * finalHeight;

          const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
          const z = brightness * params.depthStrength;

          positions.push(x, y, z);
          sizes.push(Math.random() * 0.5 + 0.5);
          randomness.push(Math.random());
        }

      } else {
        const galaxyColor1 = new THREE.Color('#00ffff');
        const galaxyColor2 = new THREE.Color('#ff00ff');

        for (let i = 0; i < count; i++) {
          const r = Math.random() * 50;
          const spinAngle = r * 0.2;
          const branchAngle = (i % 3) * ((Math.PI * 2) / 3);

          const randomX = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * (10 - r * 0.1);
          const randomY = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * (10 - r * 0.1);
          const randomZ = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * (10 - r * 0.1);

          const x = Math.cos(spinAngle + branchAngle) * r + randomX;
          const y = (Math.random() - 0.5) * (r * 0.2) + randomY;
          const z = Math.sin(spinAngle + branchAngle) * r + randomZ;

          positions.push(x, y, z);

          const mixedColor = galaxyColor1.clone().lerp(galaxyColor2, r / 50);
          colors.push(mixedColor.r, mixedColor.g, mixedColor.b);

          sizes.push(Math.random());
          randomness.push(Math.random());
        }
      }

      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
      geometry.setAttribute('randomness', new THREE.Float32BufferAttribute(randomness, 1));

      if (!material) {
        material = new THREE.ShaderMaterial({
          uniforms: {
            uTime: { value: 0 },
            uPixelRatio: { value: renderer.getPixelRatio() },
            uSize: { value: params.size },
            uOpacity: { value: params.opacity },
            uPinch: { value: 0 }
          },
          vertexShader: `
                        uniform float uTime;
                        uniform float uPixelRatio;
                        uniform float uSize;
                        uniform float uPinch;
                        
                        attribute float size;
                        attribute float randomness;
                        attribute vec3 color;
                        
                        varying vec3 vColor;

                        void main() {
                            vec3 pos = position;
                            
                            float wave = sin(pos.x * 0.1 + uTime) * 0.5 + cos(pos.y * 0.1 + uTime) * 0.5;
                            pos.z += wave * 0.5; 

                            vec3 dir = normalize(pos);
                            if (length(pos) < 0.1) dir = vec3(0.0, 0.0, 1.0);
                            
                            float explosionDist = uPinch * (50.0 + randomness * 300.0);
                            pos += dir * explosionDist;
                            
                            pos.x += sin(uTime * 5.0 + randomness * 100.0) * 0.1;
                            pos.y += cos(uTime * 5.0 + randomness * 100.0) * 0.1;

                            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                            
                            gl_PointSize = (uSize * size * (1.0 + uPinch * 5.0)) * uPixelRatio * (1.0 / -mvPosition.z);
                            gl_PointSize = min(gl_PointSize, 500.0);

                            gl_Position = projectionMatrix * mvPosition;
                            
                            vColor = color + vec3(uPinch * 0.8);
                        }
                    `,
          fragmentShader: `
                        uniform float uOpacity; 
                        varying vec3 vColor;
                        
                        void main() {
                            vec2 xy = gl_PointCoord.xy - vec2(0.5);
                            float ll = length(xy);
                            if(ll > 0.5) discard;
                            
                            float alpha = (0.5 - ll) * 2.0;
                            alpha = pow(alpha, 2.0);

                            gl_FragColor = vec4(vColor, alpha * uOpacity);
                        }
                    `,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        });
      }

      particles = new THREE.Points(geometry, material);
      particles.visible = !isPhotoMode;
      scene.add(particles);
    }

    function onWindowResize() {
      if (!camera || !renderer) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      if (composer) composer.setSize(window.innerWidth, window.innerHeight);
      if (material) material.uniforms.uPixelRatio.value = renderer.getPixelRatio();
    }

    function onHandsResults(results: any) {
      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        handPresent = true;
        const landmarks = results.multiHandLandmarks[0];
        
        const thumb = landmarks[4];
        const index = landmarks[8];
        const dist = Math.hypot(thumb.x - index.x, thumb.y - index.y);
        
        pinchStrength = Math.max(0, Math.min(1, (0.1 - dist) * 10));
        
        const wrist = landmarks[0];
        targetRotationY = (wrist.x - 0.5) * 3;
        targetRotationX = (wrist.y - 0.5) * 2;
      } else {
        handPresent = false;
        pinchStrength = 0;
      }
    }

    function initMediaPipe() {
      if (!videoRef.current) return;
      const videoElement = videoRef.current;
      const hands = new window.Hands({locateFile: (file: string) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      }});
      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });
      hands.onResults(onHandsResults);
      
      cameraUtils = new window.Camera(videoElement, {
        onFrame: async () => {
          await hands.send({image: videoElement});
        },
        width: 640,
        height: 480
      });
    }

    function animate() {
      animationId = requestAnimationFrame(animate);
      
      const delta = clock.getDelta();
      time += delta;
      
      if (material) material.uniforms.uTime.value = time;
      
      if (isHoldingExplode) {
        manualExplosionStrength = Math.min(manualExplosionStrength + delta * 2, 1);
      } else {
        manualExplosionStrength = Math.max(manualExplosionStrength - delta * 2, 0);
      }
      
      let pinch = manualExplosionStrength;
      if (isCameraActive && handPresent) pinch = Math.max(pinch, pinchStrength);
      
      if (material) {
        material.uniforms.uPinch.value += (pinch - material.uniforms.uPinch.value) * 0.1;
      }
      
      if (camera) {
        if (isIntroAnimation) {
          camera.position.lerp(new THREE.Vector3(0,0,150), 0.05);
          camera.lookAt(0,0,0);
          if (camera.position.distanceTo(new THREE.Vector3(0,0,150)) < 1) {
            isIntroAnimation = false;
            if(controls) {
              controls.enabled = true;
              controls.saveState();
            }
          }
        } else if (isCameraActive && handPresent) {
          const r = 150;
          const tx = r * Math.sin(targetRotationY);
          const ty = r * Math.sin(-targetRotationX);
          const tz = r * Math.cos(targetRotationY);
          
          camera.position.x += (tx - camera.position.x) * 0.1;
          camera.position.y += (ty - camera.position.y) * 0.1;
          camera.position.z += (tz - camera.position.z) * 0.1;
          camera.lookAt(0,0,0);
        } else if (params.floating && !isHoldingExplode) {
          const angle = params.floatSpeed * 0.1 * delta;
          const x = camera.position.x;
          const z = camera.position.z;
          camera.position.x = x * Math.cos(angle) - z * Math.sin(angle);
          camera.position.z = x * Math.sin(angle) + z * Math.cos(angle);
          camera.lookAt(0,0,0);
        }
      }
      
      if (controls && !isCameraActive && !isIntroAnimation) controls.update();
      if (composer) composer.render();
    }

    const loadScript = (src: string) => {
      return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve(true);
          return;
        }
        const s = document.createElement('script');
        s.src = src;
        s.crossOrigin = "anonymous";
        s.onload = resolve;
        s.onerror = reject;
        document.body.appendChild(s);
      });
    };

    const startApp = async () => {
      try {
        await Promise.all([
          loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js"),
          loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/control_utils/control_utils.js"),
          loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js")
        ]);
        init();
        initUI();
        initMediaPipe();
        initFileUpload();
        animate();
      } catch (err) {
        console.error(err);
      }
    };

    startApp();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', onWindowResize);
      if (gui) gui.destroy();
      if (renderer) renderer.dispose();
      if (containerRef.current && renderer && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css" />
      <style>{`
        body {
            margin: 0;
            overflow: hidden;
            background-color: #020205;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            touch-action: none;
            -webkit-user-select: none;
            user-select: none;
            -webkit-tap-highlight-color: transparent;
            position: fixed;
            width: 100%;
            height: 100%;
            overscroll-behavior: none;
        }
        
        #canvas-container {
            width: 100vw;
            height: 100vh;
            height: 100dvh; 
            position: absolute;
            top: 0;
            left: 0;
            z-index: 1;
        }

        #video-input {
            position: absolute;
            top: 0;
            left: 0;
            width: 1px;
            height: 1px;
            opacity: 0;
            pointer-events: none;
            z-index: -1;
        }

        #ui-layer {
            position: fixed; 
            bottom: 30px;
            left: 20px;
            transform: none;
            
            max-width: 420px;
            width: calc(100% - 40px);
            
            color: rgba(255, 255, 255, 0.95);
            z-index: 10;
            pointer-events: none;
            
            background: rgba(20, 25, 40, 0.4); 
            
            backdrop-filter: blur(20px) saturate(180%);
            -webkit-backdrop-filter: blur(20px) saturate(180%);
            
            padding: 24px;
            
            border-radius: 24px;
            
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-top: 1px solid rgba(255, 255, 255, 0.2);
            border-bottom: 1px solid rgba(0, 0, 0, 0.2);
            
            box-shadow: 
                0 10px 40px rgba(0, 0, 0, 0.4),
                inset 0 0 0 1px rgba(255, 255, 255, 0.05);
            
            transition: opacity 0.3s ease;
            
            text-align: center;
        }
        
        #ui-layer > * {
            pointer-events: auto;
        }

        h1 {
            font-weight: 300;
            margin: 0 0 12px 0;
            font-size: 1.5rem;
            letter-spacing: 2px;
            text-transform: uppercase;
            background: linear-gradient(120deg, #ffffff 0%, #a5b4fc 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            position: relative;
            padding-bottom: 12px;
            text-align: center;
            text-shadow: none;
        }
        
        h1::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 40px;
            height: 2px;
            background: rgba(165, 180, 252, 0.5);
            border-radius: 2px;
            box-shadow: none;
        }

        .social-row {
            display: flex;
            gap: 10px;
            margin-bottom: 15px; 
            pointer-events: auto; 
            justify-content: center;
        }

        .social-btn {
            color: rgba(255, 255, 255, 0.7);
            font-size: 1.1rem;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 8px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            text-decoration: none;
            box-shadow: none;
        }

        .social-btn:hover {
            color: #fff;
            background: rgba(255, 255, 255, 0.15);
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(165, 180, 252, 0.3);
            border-color: rgba(165, 180, 252, 0.4);
        }

        .social-btn:hover .fa-instagram { color: #e1306c; text-shadow: none; }
        .social-btn:hover .fa-youtube { color: #ff0000; text-shadow: none; }
        .social-btn:hover .fa-threads { color: #fff; text-shadow: none; } 
        .social-btn:hover .fa-mug-hot { color: #13C3FF; text-shadow: none; } 

        .ui-footer-row {
            margin-top: 12px;
            padding-top: 10px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            justify-content: center;
            gap: 8px;
            align-items: center;
            flex-wrap: wrap;
        }

        .mode-btn, .reset-btn {
            background: transparent;
            border: 1px solid rgba(165, 180, 252, 0.3);
            color: rgba(165, 180, 252, 0.8);
            border-radius: 6px;
            padding: 4px 10px;
            font-size: 0.75rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            font-family: inherit;
            text-transform: uppercase;
            letter-spacing: 1px;
            display: flex;
            align-items: center;
            gap: 6px;
            outline: none;
            justify-content: center;
            white-space: nowrap;
            user-select: none;
            -webkit-user-select: none;
            -webkit-touch-callout: none;
            
            backdrop-filter: none;
            box-shadow: none;
        }

        .mode-btn:hover, .reset-btn:hover {
            background: rgba(165, 180, 252, 0.15);
            color: #fff;
            border-color: #a5b4fc;
            box-shadow: 0 0 12px rgba(165, 180, 252, 0.4);
            transform: translateY(-1px);
        }
        
        .mode-btn:active, .reset-btn:active {
            transform: translateY(1px);
            background: rgba(165, 180, 252, 0.25);
        }
        
        .mode-btn.active-photo, .reset-btn.active-music {
            background: rgba(165, 180, 252, 0.25);
            color: #fff;
            border-color: #fff;
            box-shadow: 0 0 15px rgba(255, 255, 255, 0.4);
        }

        .lil-gui { 
            --background-color: rgba(20, 25, 40, 0.4);
            --text-color: rgba(255, 255, 255, 0.95);
            --title-background-color: transparent;
            --widget-color: rgba(255, 255, 255, 0.1);
            --hover-color: rgba(255, 255, 255, 0.2);
            --focus-color: rgba(255, 255, 255, 0.3);
            --number-color: #a5b4fc;
            --string-color: #6ee7b7;
            
            backdrop-filter: blur(20px) saturate(180%);
            -webkit-backdrop-filter: blur(20px) saturate(180%);
            
            border-radius: 24px !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            border-top: 1px solid rgba(255, 255, 255, 0.2) !important;
            border-bottom: 1px solid rgba(0, 0, 0, 0.2) !important;
            border-left: none !important;
            
            box-shadow: 
                0 10px 40px rgba(0, 0, 0, 0.4),
                inset 0 0 0 1px rgba(255, 255, 255, 0.05) !important;
                
            padding-bottom: 15px;
        }
        
        .lil-gui .title {
            height: 40px;
            line-height: 40px;
            font-size: 14px;
            font-weight: 500;
            letter-spacing: 2px;
            text-transform: uppercase;
            color: #a5b4fc; 
            text-shadow: 0 0 15px rgba(165, 180, 252, 0.4);
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            background: transparent;
            text-align: center;
        }

        .lil-gui .children {
            padding: 10px;
        }
        
        .lil-gui.autoPlace {
            top: 30px !important;
            right: 20px !important;
            max-width: calc(100vw - 20px) !important;
            width: auto !important;
        }

        #loading {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            font-size: 1rem;
            z-index: 20;
            transition: opacity 1s ease;
            text-align: center;
            width: 80%;
            text-shadow: 0 0 20px rgba(255,255,255,0.5);
            font-weight: 300;
            letter-spacing: 3px;
        }

        .status-dot {
            display: inline-block;
            width: 8px;
            height: 8px;
            background-color: #fb7185; 
            margin-right: 10px;
            border-radius: 50%;
            box-shadow: 0 0 10px rgba(251, 113, 133, 0.5);
            vertical-align: middle;
            transition: all 0.5s ease;
            position: relative;
        }
        
        .status-dot::after {
            content: '';
            position: absolute;
            top: -4px;
            left: -4px;
            right: -4px;
            bottom: -4px;
            border-radius: 50%;
            border: 1px solid currentColor;
            opacity: 0.3;
            animation: pulse 2s infinite;
        }

        .status-active { background-color: #4ade80; box-shadow: 0 0 15px rgba(74, 222, 128, 0.6); color: #4ade80; }
        .status-inactive { background-color: #94a3b8; box-shadow: none; color: #94a3b8; }
        
        @keyframes pulse {
            0% { transform: scale(0.8); opacity: 0.5; }
            100% { transform: scale(1.5); opacity: 0; }
        }
        
        .divider {
            margin-top: 16px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            padding-top: 12px;
        }

        @media (max-width: 600px) {
            #ui-layer {
                /* 手機版：完美置中靠下 */
                left: 50%;
                transform: translateX(-50%);
                
                /* 底部安全距離 */
                bottom: 15px; 
                bottom: calc(15px + env(safe-area-inset-bottom));
                
                width: 92%; /* 寬度稍微撐開 */
                padding: 0; /* 移除內距 */           
                border-radius: 0;

                /* --- 手機版背景移除修正 --- */
                background: none;
                backdrop-filter: none;
                -webkit-backdrop-filter: none;
                border: none;
                box-shadow: none;
            }
            
            #ui-layer h1 {
                font-size: 1.3rem;
                margin-bottom: 12px;
                padding-bottom: 10px;
            }
            
            /* --- 社群按鈕區塊 --- */
            .social-row {
                margin-bottom: 12px;
                gap: 10px;
            }

            /* --- 獨立毛玻璃：社群按鈕 --- */
            .social-btn {
                width: 36px;
                height: 36px;
                font-size: 1.1rem;
                
                /* 獨立毛玻璃樣式 */
                background: rgba(20, 25, 40, 0.65);
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                border: 1px solid rgba(255, 255, 255, 0.15);
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
                border-radius: 10px;
            }
            
            /* --- 功能按鈕區塊 --- */
            .ui-footer-row {
                flex-wrap: nowrap; /* 強制不換行 */
                gap: 8px; /* 增加間距 */
                justify-content: space-between; /* 均勻分佈 */
                
                /* 移除上方分隔線 */
                border-top: none;
                padding-top: 0;
            }

            /* --- 獨立毛玻璃：功能按鈕 --- */
            .reset-btn, .mode-btn {
                font-size: 11px;
                padding: 0 8px;
                height: 38px;
                letter-spacing: 0.5px;
                flex-shrink: 1;
                min-width: 0;
                
                /* 獨立毛玻璃樣式 */
                background: rgba(20, 25, 40, 0.65);
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                border: 1px solid rgba(255, 255, 255, 0.15);
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
                border-radius: 10px;
                
                color: rgba(255, 255, 255, 0.9);
                margin: 0;
            }

            /* 激活狀態 */
            .mode-btn.active-photo, .reset-btn.active-music {
                background: rgba(165, 180, 252, 0.35);
                border-color: rgba(165, 180, 252, 0.6);
                box-shadow: 0 0 15px rgba(165, 180, 252, 0.4);
                color: #fff;
            }

            .reset-btn i, .mode-btn i {
                margin-right: 3px;
            }

            #btn-music {
                flex-shrink: 0;
                padding: 0 10px;
            }
            
            .divider {
                margin-top: 10px;
                padding-top: 8px;
            }

            /* --- Control Center (lil-gui) 手機版優化 --- */
            .lil-gui.autoPlace {
                top: 10px !important;
                right: 10px !important;
                max-width: calc(100vw - 20px) !important;
                width: auto !important;
            }
            
            .lil-gui {
                --width: 260px;
                font-size: 13px;
                --widget-height: 28px;
                max-height: 50vh;
                overflow-y: auto;
                -webkit-overflow-scrolling: touch; 
            }
            
            .lil-gui .title {
                height: 36px;
                line-height: 36px;
                font-size: 12px;
            }
            
            .lil-gui .children {
                padding: 5px;
            }
        }
      `}</style>
      
      <div id="loading">Initializing Quantum Field...<br /><span style={{ fontSize: '0.7em', opacity: 0.6, letterSpacing: '1px' }}>Awaiting Input</span></div>

      <audio id="bg-music" ref={audioRef}>
        <source src="https://github.com/Asianboyneo/Asian-Boy/raw/refs/heads/main/Artlist%20Musical%20Logos%20-%20Tribal%20Rhythm.mp3" type="audio/mpeg" />
      </audio>

      <div id="ui-layer">
        <h1>ASIAN BOY VISION</h1>

        <div className="social-row">
          <a href="https://www.instagram.com/asian_boy_neo" target="_blank" className="social-btn" title="Instagram">
            <i className="fab fa-instagram"></i>
          </a>
          <a href="https://www.youtube.com/@asian_boy_neo" target="_blank" className="social-btn" title="YouTube">
            <i className="fab fa-youtube"></i>
          </a>
          <a href="https://www.threads.com/@asian_boy_neo?hl=zh-tw" target="_blank" className="social-btn" title="Threads">
            <i className="fa-brands fa-threads"></i>
          </a>
          <a href="https://ko-fi.com/asianboyneo" target="_blank" className="social-btn" title="Ko-fi">
            <i className="fa-solid fa-mug-hot"></i>
          </a>
        </div>

        <div className="ui-footer-row">
          <button id="btn-mode-toggle" className="mode-btn" ref={modeBtnRef}>
            <i className="fas fa-image"></i> Photo Mode
          </button>

          <button id="btn-explode" className="reset-btn" title="Hold to Sustain Explosion" ref={explodeBtnRef}>
            <i className="fas fa-bomb"></i> Explosion
          </button>

          <button id="btn-reset" className="reset-btn" title="Reset View" ref={resetBtnRef}>
            <i className="fas fa-sync-alt"></i> Reset
          </button>

          <button id="btn-music" className="reset-btn" title="Toggle Music" ref={musicBtnRef}>
            <i className="fas fa-volume-mute"></i>
          </button>
        </div>
      </div>

      <input type="file" id="file-input" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" />

      <video id="video-input" ref={videoRef} playsInline muted autoPlay></video>
      <div id="canvas-container" ref={containerRef}></div>
    </>
  );
}