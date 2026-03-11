"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls, useTexture } from "@react-three/drei";
import * as THREE from "three";

export type CountryCount = {
  country: string;
  count: number;
};

type GlobeMeta = {
  paperCount: number;
  extractionCount: number;
  topCountry: string | null;
  topCountryCount: number;
  missingCountryCount: number;
};

type CountryPoint = CountryCount & {
  lat: number;
  lon: number;
};

const COUNTRY_CENTROIDS: Record<string, { lat: number; lon: number }> = {
  Italy: { lat: 41.8719, lon: 12.5674 },
  Canada: { lat: 56.1304, lon: -106.3468 },
  Spain: { lat: 40.4637, lon: -3.7492 },
  "United Kingdom": { lat: 55.3781, lon: -3.436 },
  "South Korea": { lat: 35.9078, lon: 127.7669 },
  "United States": { lat: 37.0902, lon: -95.7129 },
  Netherlands: { lat: 52.1326, lon: 5.2913 },
  Japan: { lat: 36.2048, lon: 138.2529 },
  Norway: { lat: 60.472, lon: 8.4689 },
  Australia: { lat: -25.2744, lon: 133.7751 },
  "South Africa": { lat: -30.5595, lon: 22.9375 },
  Mexico: { lat: 23.6345, lon: -102.5528 },
  Kenya: { lat: -0.0236, lon: 37.9062 },
  Sweden: { lat: 60.1282, lon: 18.6435 },
  Ireland: { lat: 53.1424, lon: -7.6921 },
  Finland: { lat: 61.9241, lon: 25.7482 },
  Singapore: { lat: 1.3521, lon: 103.8198 },
  Taiwan: { lat: 23.6978, lon: 120.9605 },
  France: { lat: 46.2276, lon: 2.2137 },
  Denmark: { lat: 56.2639, lon: 9.5018 },
  Germany: { lat: 51.1657, lon: 10.4515 },
  Brazil: { lat: -14.235, lon: -51.9253 },
  Austria: { lat: 47.5162, lon: 14.5501 },
  Iceland: { lat: 64.9631, lon: -19.0208 },
  Portugal: { lat: 39.3999, lon: -8.2245 },
  Argentina: { lat: -38.4161, lon: -63.6167 },
  Turkey: { lat: 38.9637, lon: 35.2433 },
  "New Zealand": { lat: -40.9006, lon: 174.886 },
  China: { lat: 35.8617, lon: 104.1954 },
  Switzerland: { lat: 46.8182, lon: 8.2275 },
  India: { lat: 20.5937, lon: 78.9629 },
  Greece: { lat: 39.0742, lon: 21.8243 },
  "Czech Republic": { lat: 49.8175, lon: 15.473 },
};

const degToRad = (deg: number) => (deg * Math.PI) / 180;

const hash01 = (value: number) => {
  const x = Math.sin(value * 127.1) * 43758.5453123;
  return x - Math.floor(x);
};

const latLonToVector3 = (lat: number, lon: number, radius: number) => {
  const phi = degToRad(90 - lat);
  const theta = degToRad(lon + 180);

  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);

  return new THREE.Vector3(x, y, z);
};

function AtmosphereGlow({ radius }: { radius: number }) {
  const innerShader = useMemo(
    () => ({
      uniforms: {
        glowColor: { value: new THREE.Color("#c0daf4") },
        intensityPower: { value: 5.4 },
        intensityBase: { value: 0.8 },
        opacityScale: { value: 0.5 },
      },
      vertexShader: `
        varying vec3 vNormal;

        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        uniform float intensityPower;
        uniform float intensityBase;
        uniform float opacityScale;
        varying vec3 vNormal;

        void main() {
          float intensity = pow(intensityBase - dot(vNormal, vec3(0.0, 0.0, 1.0)), intensityPower);
          gl_FragColor = vec4(glowColor * intensity, intensity * opacityScale);
        }
      `,
    }),
    [],
  );

  const outerShader = useMemo(
    () => ({
      uniforms: {
        glowColor: { value: new THREE.Color("#8abcee") },
        intensityPower: { value: 3.4 },
        intensityBase: { value: 0.8 },
        opacityScale: { value: 0.055 },
      },
      vertexShader: `
        varying vec3 vNormal;

        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        uniform float intensityPower;
        uniform float intensityBase;
        uniform float opacityScale;
        varying vec3 vNormal;

        void main() {
          float intensity = pow(intensityBase - dot(vNormal, vec3(0.0, 0.0, 1.0)), intensityPower);
          gl_FragColor = vec4(glowColor * intensity, intensity * opacityScale);
        }
      `,
    }),
    [],
  );

  return (
    <group>
      <mesh scale={1.04}>
        <sphereGeometry args={[radius, 96, 96]} />
        <shaderMaterial
          args={[innerShader]}
          transparent
          blending={THREE.AdditiveBlending}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      <mesh scale={1.09}>
        <sphereGeometry args={[radius, 96, 96]} />
        <shaderMaterial
          args={[outerShader]}
          transparent
          blending={THREE.AdditiveBlending}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function Starfield() {
  const ref = useRef<THREE.Points>(null);
  const sprite = useMemo(() => {
    const size = 64;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const gradient = ctx.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2,
    );
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.45, "rgba(255,255,255,0.9)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);

  const positions = useMemo(() => {
    const count = 1800;
    const array = new Float32Array(count * 3);

    for (let i = 0; i < count; i += 1) {
      const radius = 6 + hash01(i + 1) * 7;
      const theta = hash01(i + 11) * Math.PI * 2;
      const phi = Math.acos(2 * hash01(i + 29) - 1);
      const index = i * 3;
      array[index] = radius * Math.sin(phi) * Math.cos(theta);
      array[index + 1] = radius * Math.cos(phi);
      array[index + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }

    return array;
  }, []);

  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += delta * 0.01;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        map={sprite ?? undefined}
        color="#f8fbff"
        size={0.06}
        sizeAttenuation
        transparent
        opacity={0.72}
        depthWrite={false}
        alphaTest={0.08}
      />
    </points>
  );
}

function GlobeShell({ radius }: { radius: number }) {
  const cloudsRef = useRef<THREE.Mesh>(null);
  const textures = useTexture([
    "/textures/earth/earth_atmos_2048.jpg",
    "/textures/earth/earth_normal_2048.jpg",
    "/textures/earth/earth_specular_2048.jpg",
    "/textures/earth/earth_clouds_1024.png",
  ]);
  const [colorMap, normalMap, specularMap, cloudMap] = useMemo(() => {
    const [color, normal, specular, clouds] = textures.map((texture) =>
      texture.clone(),
    ) as [THREE.Texture, THREE.Texture, THREE.Texture, THREE.Texture];

    color.colorSpace = THREE.SRGBColorSpace;
    clouds.colorSpace = THREE.SRGBColorSpace;
    color.anisotropy = 8;
    normal.anisotropy = 8;
    specular.anisotropy = 8;
    clouds.anisotropy = 8;

    return [color, normal, specular, clouds];
  }, [textures]);

  useFrame((_, delta) => {
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += delta * 0.04;
    }
  });

  return (
    <group>
      <mesh>
        <sphereGeometry args={[radius, 96, 96]} />
        <meshPhongMaterial
          map={colorMap}
          normalMap={normalMap}
          specularMap={specularMap}
          specular="#5e7897"
          emissive="#07101e"
          emissiveIntensity={0.12}
          shininess={18}
        />
      </mesh>

      <mesh ref={cloudsRef}>
        <sphereGeometry args={[radius * 1.012, 96, 96]} />
        <meshPhongMaterial
          map={cloudMap}
          transparent
          opacity={0.16}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      <AtmosphereGlow radius={radius} />
    </group>
  );
}

function CountryCountBubbles({
  radius,
  points,
  onHoverChange,
}: {
  radius: number;
  points: CountryPoint[];
  onHoverChange?: (point: CountryPoint | null) => void;
}) {
  const [hovered, setHovered] = useState<CountryPoint | null>(null);
  const groupRef = useRef<THREE.Group>(null);
  const maxCount = Math.max(1, ...points.map((point) => point.count));
  const maxRadiusBase = Math.sqrt(maxCount);
  const { camera } = useThree();

  useEffect(() => {
    onHoverChange?.(hovered);
  }, [hovered, onHoverChange]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.children.forEach((child, index) => {
      const mesh = child as THREE.Group;
      const point = points[index];
      const isHovered = hovered?.country === point?.country;
      const pulse = isHovered
        ? 1
        : 1 + Math.sin(clock.elapsedTime * 1.5 + index * 0.8) * 0.04;
      mesh.scale.setScalar(pulse);
    });
  });

  return (
    <group ref={groupRef}>
      {points.map((point, index) => {
        const base = latLonToVector3(point.lat, point.lon, radius);
        const normal = base.clone().normalize();
        const strength = Math.sqrt(point.count) / Math.max(1, maxRadiusBase);
        const bubbleRadius = 0.009 + strength * 0.024;
        const ringRadius = 0.055 + strength * 0.065;
        const color = new THREE.Color().setHSL(
          0.13 - strength * 0.03,
          0.92,
          0.72,
        );
        const haloColor = new THREE.Color().setHSL(0.14, 0.98, 0.8);
        const nearViewportEdge = Math.abs(normal.x) > 0.52;
        const labelSide = nearViewportEdge
          ? normal.x >= 0
            ? -1
            : 1
          : normal.x >= 0
            ? 1
            : -1;
        const labelOffsetX =
          labelSide *
          (nearViewportEdge
            ? 0.12 + ringRadius * 0.75
            : 0.16 + ringRadius * 1.2);
        const labelOffsetY =
          bubbleRadius +
          0.02 +
          Math.abs(normal.y) * 0.025 +
          (nearViewportEdge ? 0.012 : 0);

        const position = normal.clone().multiplyScalar(radius + 0.008);
        const quaternion = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          normal,
        );

        const isHovered = hovered?.country === point.country;

        return (
          <group
            key={point.country}
            position={position}
            quaternion={quaternion}
            renderOrder={index + 1}
          >
            <mesh
              position={[0, bubbleRadius * 0.9 + 0.012, 0]}
              onPointerOver={(event) => {
                event.stopPropagation();
                const worldPosition = event.object.getWorldPosition(
                  new THREE.Vector3(),
                );
                const cameraDirection = camera.position.clone().normalize();
                const markerDirection = worldPosition.normalize();
                const visibility = markerDirection.dot(cameraDirection);
                if (visibility < 0.18) return;
                setHovered(point);
              }}
              onPointerOut={() => {
                setHovered((current) =>
                  current?.country === point.country ? null : current,
                );
              }}
            >
              <sphereGeometry args={[bubbleRadius * 1.9, 18, 18]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>

            <mesh position={[0, bubbleRadius * 0.9 + 0.012, 0]}>
              <sphereGeometry args={[bubbleRadius, 20, 20]} />
              <meshStandardMaterial
                color={color}
                emissive={haloColor}
                emissiveIntensity={isHovered ? 1.05 : 0.55}
                transparent
                opacity={0.95}
                metalness={0.02}
                roughness={0.14}
              />
            </mesh>

            {isHovered ? (
              <>
                <mesh rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[ringRadius * 0.86, ringRadius, 48]} />
                  <meshBasicMaterial
                    color="#f5f0df"
                    transparent
                    opacity={0.92}
                    side={THREE.DoubleSide}
                  />
                </mesh>

                <mesh rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry
                    args={[ringRadius * 1.18, ringRadius * 1.38, 48]}
                  />
                  <meshBasicMaterial
                    color={haloColor}
                    transparent
                    opacity={0.22}
                    side={THREE.DoubleSide}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                  />
                </mesh>

                <mesh position={[0, bubbleRadius * 0.9 + 0.012, 0]}>
                  <sphereGeometry args={[bubbleRadius * 3.2, 22, 22]} />
                  <meshBasicMaterial
                    color={haloColor}
                    transparent
                    opacity={0.12}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                  />
                </mesh>

                <Html
                  position={[labelOffsetX, labelOffsetY, 0]}
                  distanceFactor={12}
                >
                  <div
                    className={`pointer-events-none min-w-[104px] max-w-[132px] text-[9px] leading-3 text-white ${
                      labelSide > 0 ? "text-left" : "text-right"
                    }`}
                  >
                    <div className="font-medium">{point.country}</div>
                    <div className="mt-0.5 text-[8px] text-slate-300">
                      {point.count} study{point.count === 1 ? "" : "ies"}
                    </div>
                  </div>
                </Html>
              </>
            ) : null}
          </group>
        );
      })}
    </group>
  );
}

function EarthScene({
  radius,
  points,
  onHoverChange,
}: {
  radius: number;
  points: CountryPoint[];
  onHoverChange?: (point: CountryPoint | null) => void;
}) {
  const earthGroupRef = useRef<THREE.Group>(null);
  const [isHoveringMarker, setIsHoveringMarker] = useState(false);

  useFrame((_, delta) => {
    if (!earthGroupRef.current) return;
    if (isHoveringMarker) return;
    earthGroupRef.current.rotation.y += delta * 0.022;
  });

  return (
    <group ref={earthGroupRef}>
      <GlobeShell radius={radius} />
      <CountryCountBubbles
        radius={radius}
        points={points}
        onHoverChange={(point) => {
          setIsHoveringMarker(point !== null);
          onHoverChange?.(point);
        }}
      />
    </group>
  );
}

export function CountryGlobe({
  countries,
  meta,
}: {
  countries: CountryCount[];
  meta: GlobeMeta;
}) {
  const radius = 1.5;
  const [hoveredPoint, setHoveredPoint] = useState<CountryPoint | null>(null);

  const points = useMemo(() => {
    return countries
      .map((item) => {
        const centroid = COUNTRY_CENTROIDS[item.country];
        if (!centroid) return null;
        return {
          ...item,
          lat: centroid.lat,
          lon: centroid.lon,
        } satisfies CountryPoint;
      })
      .filter((item): item is CountryPoint => item !== null)
      .sort((a, b) => b.count - a.count);
  }, [countries]);

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.08),transparent_26%),linear-gradient(180deg,#000000_0%,#010103_55%,#000000_100%)]">
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        camera={{ position: [0, 0.08, 5.55], fov: 38 }}
      >
        <color attach="background" args={["#010103"]} />
        <fog attach="fog" args={["#010103", 6.8, 13.5]} />
        <ambientLight intensity={0.46} />
        <hemisphereLight args={["#d8f0ff", "#010103", 0.42]} />
        <pointLight position={[4.5, 2.8, 3.2]} intensity={50} color="#8fd4ff" />
        <directionalLight
          position={[-4, -1.5, -5]}
          intensity={0.72}
          color="#c0dcff"
        />

        <Starfield />
        <EarthScene
          radius={radius}
          points={points}
          onHoverChange={setHoveredPoint}
        />

        <OrbitControls
          enablePan={false}
          minDistance={3.7}
          maxDistance={7.6}
          rotateSpeed={0.58}
          zoomSpeed={0.75}
          autoRotate={!hoveredPoint}
          autoRotateSpeed={0.28}
        />
      </Canvas>

      <div className="pointer-events-none absolute bottom-7 right-7 flex h-[140px] w-[240px] flex-col justify-end text-right text-[13px] leading-5 text-slate-200">
        <div className="space-y-1 text-right">
          <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
            Sample meta
          </div>
          <div className="text-xs text-slate-400">
            Drag to rotate. Hover a marker to inspect counts.
          </div>
          <div className="pt-3 text-xs text-slate-500">
            {points.length} mapped countries
          </div>
          <div className="text-xs text-slate-500">{meta.paperCount} papers</div>
          <div className="text-xs text-slate-500">
            {meta.extractionCount} extractions
          </div>
          {meta.topCountry ? (
            <div className="text-xs text-slate-500">
              top: {meta.topCountry} ({meta.topCountryCount})
            </div>
          ) : null}
          {meta.missingCountryCount ? (
            <div className="text-xs text-slate-500">
              unmapped: {meta.missingCountryCount}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
