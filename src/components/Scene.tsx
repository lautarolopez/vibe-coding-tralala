import {
  RepeatWrapping,
  TextureLoader,
  DoubleSide,
  EllipseCurve,
  BufferGeometry,
  Float32BufferAttribute,
} from "three";
import { useLoader } from "@react-three/fiber";

export default function Scene() {
  // Oval parameters for a 90x60 wall (dimensions are full size; using half for radii)
  const radiusX = 45; // Half of 90 (width of the oval)
  const radiusZ = 30; // Half of 60 (height of the oval)
  const wallHeight = 15;

  // Load and configure floor textures
  const [floorColor, floorNormal, floorRoughness, floorAo] = useLoader(
    TextureLoader,
    [
      "/textures/floor/concrete_0031_color_2k.jpg",
      "/textures/floor/concrete_0031_normal_opengl_2k.png",
      "/textures/floor/concrete_0031_roughness_2k.jpg",
      "/textures/floor/concrete_0031_ao_2k.jpg",
    ]
  );

  // Load and configure wall textures
  const [wallColor, wallNormal, wallRoughness, wallAo] = useLoader(
    TextureLoader,
    [
      "/textures/walls/Bricks094_2K-JPG_Color.jpg",
      "/textures/walls/Bricks094_2K-JPG_NormalGL.jpg",
      "/textures/walls/Bricks094_2K-JPG_Roughness.jpg",
      "/textures/walls/Bricks094_2K-JPG_AmbientOcclusion.jpg",
    ]
  );

  // Configure floor texture settings
  [floorColor, floorNormal, floorRoughness, floorAo].forEach((texture) => {
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.repeat.set(50, 50);
  });

  // Configure wall texture settings
  [wallColor, wallNormal, wallRoughness, wallAo].forEach((texture) => {
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.repeat.set(15, 2); // Adjust for wall dimensions
  });

  // Create the fence geometry for the oval arena
  const segments = 128;
  const ellipseCurve = new EllipseCurve(
    0,
    0,
    radiusX,
    radiusZ,
    0,
    Math.PI * 2,
    false,
    0
  );
  const fencePoints = ellipseCurve.getPoints(segments);
  const vertices = [];
  const indices = [];
  const uvs = [];

  for (let i = 0; i < fencePoints.length; i++) {
    const p1 = fencePoints[i];
    const p2 = fencePoints[(i + 1) % fencePoints.length];

    // Calculate UV coordinates based on position in the oval
    const uv1 = i / fencePoints.length;
    const uv2 = (i + 1) / fencePoints.length;

    // Lower vertices
    vertices.push(p1.x, 0, p1.y);
    vertices.push(p2.x, 0, p2.y);
    uvs.push(uv1, 0, uv2, 0);

    // Upper vertices
    vertices.push(p1.x, wallHeight, p1.y);
    vertices.push(p2.x, wallHeight, p2.y);
    uvs.push(uv1, 1, uv2, 1);

    const baseIndex = i * 4;
    // First triangle
    indices.push(baseIndex, baseIndex + 2, baseIndex + 1);
    // Second triangle
    indices.push(baseIndex + 2, baseIndex + 3, baseIndex + 1);
  }

  const fenceGeometry = new BufferGeometry();
  fenceGeometry.setAttribute(
    "position",
    new Float32BufferAttribute(vertices, 3)
  );
  fenceGeometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  fenceGeometry.setIndex(indices);
  fenceGeometry.computeVertexNormals();

  return (
    <group>
      {/* Lighting */}
      <ambientLight intensity={0.5} />{" "}
      {/* Soft ambient light for overall illumination */}
      <directionalLight
        position={[-50, 50, -30]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={100}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
      />
      {/* Infinite ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[2000, 2000]} />
        <meshStandardMaterial
          map={floorColor}
          normalMap={floorNormal}
          roughnessMap={floorRoughness}
          aoMap={floorAo}
          color="#bbb"
          roughness={1}
          metalness={0}
        />
      </mesh>
      {/* Oval fence enclosing the arena */}
      <mesh geometry={fenceGeometry} name="wall" castShadow receiveShadow>
        <meshStandardMaterial
          color="#fff"
          side={DoubleSide}
          map={wallColor}
          normalMap={wallNormal}
          roughnessMap={wallRoughness}
          aoMap={wallAo}
        />
      </mesh>
    </group>
  );
}
