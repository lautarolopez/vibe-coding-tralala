import { useRef, useState, useCallback, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useKeyboardControls } from "./useKeyboardControls";
import { Mesh, Vector3, Matrix4, Raycaster } from "three";
import { useGLTF } from "@react-three/drei";
import Missile from "./Missile";

interface MissileData {
  id: number;
  position: Vector3;
  direction: Vector3;
}

export default function Character() {
  const meshRef = useRef<Mesh>(null);
  const velocity = useRef<Vector3>(new Vector3());
  const direction = useRef<Vector3>(new Vector3());
  const currentSpeed = useRef<number>(0);
  const [modelError, setModelError] = useState(false);
  const [missiles, setMissiles] = useState<MissileData[]>([]);
  const nextMissileId = useRef(0);
  const { forward, backward, left, right, jump, sprint } =
    useKeyboardControls();
  const { scene } = useThree();

  // Load the 3D model
  const { scene: crocodiloScene } = useGLTF(
    "/models/characters/BombardinoCrocodilo.glb"
  );

  // Enable shadows for the loaded model
  crocodiloScene.traverse((child) => {
    if (child.isObject3D) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  // Movement parameters
  const walkSpeed = 0.1;
  const sprintSpeed = 0.2;
  const acceleration = 0.01; // How quickly to reach max speed
  const deceleration = 0.015; // How quickly to slow down
  const rotationSpeed = 0.05;

  // Jump and gravity parameters
  const jumpForce = 0.15;
  const gravity = 0.006;
  const isGrounded = useRef(true);

  // Collision detection parameters
  const raycaster = new Raycaster();
  const characterRadius = 0.8; // Increased radius for better collision
  const collisionPadding = 0.3; // Increased padding

  const checkWallCollision = (
    currentPosition: Vector3,
    proposedPosition: Vector3
  ): {
    collided: boolean;
    normal?: Vector3;
    safePosition?: Vector3;
    type?: string;
  } => {
    if (!meshRef.current) return { collided: false };

    // First, check if the proposed position is within the oval bounds
    const innerRadiusX = 44.5;
    const innerRadiusZ = 29.5;
    const ellipseValue =
      (proposedPosition.x * proposedPosition.x) /
        (innerRadiusX * innerRadiusX) +
      (proposedPosition.z * proposedPosition.z) / (innerRadiusZ * innerRadiusZ);

    if (ellipseValue > 1) {
      // Character would be outside the allowed area
      const t = Math.sqrt(ellipseValue);
      return {
        collided: true,
        type: "ellipse",
        safePosition: new Vector3(
          proposedPosition.x / t,
          proposedPosition.y,
          proposedPosition.z / t
        ),
      };
    }

    // Wall collision detection
    let closestDistance = Infinity;
    let closestIntersection;
    let closestNormal: Vector3 | undefined;
    let hasCollision = false;

    // Get all wall objects
    const walls: any[] = [];
    scene.traverse((child) => {
      if (child.name === "wall") walls.push(child);
    });

    // Check collisions in multiple directions
    const numRays = 16;
    const rayDirections: Vector3[] = [];

    // Add rays in a circle
    for (let i = 0; i < numRays; i++) {
      const angle = (i / numRays) * Math.PI * 2;
      rayDirections.push(new Vector3(Math.cos(angle), 0, Math.sin(angle)));
    }

    // Add ray in movement direction
    const movementDir = proposedPosition
      .clone()
      .sub(currentPosition)
      .normalize();
    if (movementDir.lengthSq() > 0) {
      rayDirections.push(movementDir);
    }

    // Cast rays
    for (const rayDirection of rayDirections) {
      raycaster.set(currentPosition, rayDirection);
      const intersects = raycaster.intersectObjects(walls, true);

      if (intersects.length > 0) {
        const distance = intersects[0].distance;
        if (
          distance < characterRadius + collisionPadding &&
          distance < closestDistance
        ) {
          hasCollision = true;
          closestDistance = distance;
          closestIntersection = intersects[0];
          closestNormal = intersects[0].face?.normal
            .clone()
            .applyMatrix4(
              new Matrix4().extractRotation(intersects[0].object.matrixWorld)
            );
        }
      }
    }

    if (hasCollision && closestNormal && closestIntersection) {
      const diff = currentPosition.clone().sub(closestIntersection.point);
      if (diff.dot(closestNormal) < 0) {
        closestNormal.negate();
      }
    }

    if (hasCollision && closestNormal) {
      // Calculate movement vector
      const movementVector = proposedPosition.clone().sub(currentPosition);
      const dot = movementVector.dot(closestNormal);

      // Calculate push-out vector to prevent sticking
      const pushOut = closestNormal
        .clone()
        .multiplyScalar(
          Math.max(0, characterRadius + collisionPadding - closestDistance)
        );

      // If we're too close to the wall, push out first
      if (pushOut.lengthSq() > 0) {
        const safePosition = currentPosition.clone().add(pushOut);

        // Then allow sliding along the wall
        if (movementVector.lengthSq() > 0) {
          const slideVector = movementVector
            .clone()
            .sub(closestNormal.clone().multiplyScalar(dot));
          safePosition.add(slideVector);
        }

        return {
          collided: true,
          normal: closestNormal,
          safePosition: safePosition,
        };
      }

      // If just sliding along wall
      const slideVector = movementVector
        .clone()
        .sub(closestNormal.clone().multiplyScalar(Math.min(0, dot)));

      return {
        collided: true,
        normal: closestNormal,
        safePosition: currentPosition.clone().add(slideVector),
      };
    }

    return { collided: false };
  };

  useFrame(() => {
    if (!meshRef.current) return;

    // Reset horizontal velocity
    velocity.current.setX(0).setZ(0);
    direction.current.set(0, 0, 0);

    // Handle rotation with A/D keys
    if (left) {
      meshRef.current.rotation.y += rotationSpeed;
    }
    if (right) {
      meshRef.current.rotation.y -= rotationSpeed;
    }

    // Get character's forward vector for movement
    const matrix = new Matrix4();
    matrix.extractRotation(meshRef.current.matrix);
    const forwardVector = new Vector3(0, 0, 1).applyMatrix4(matrix);

    // Apply forward/backward movement based on character's orientation
    if (forward) direction.current.add(forwardVector);
    if (backward) direction.current.sub(forwardVector);

    // Calculate target speed based on sprint state
    const targetSpeed = sprint ? sprintSpeed : walkSpeed;

    // Apply acceleration/deceleration
    if (direction.current.lengthSq() > 0) {
      currentSpeed.current = Math.min(
        targetSpeed,
        currentSpeed.current + (sprint ? acceleration * 2 : acceleration)
      );
    } else {
      currentSpeed.current = Math.max(0, currentSpeed.current - deceleration);
    }

    // Apply movement with current speed
    if (direction.current.lengthSq() > 0) {
      direction.current.normalize();
      velocity.current.x = direction.current.x * currentSpeed.current;
      velocity.current.z = direction.current.z * currentSpeed.current;
    }

    // Handle jumping
    if (jump && isGrounded.current) {
      velocity.current.y = jumpForce;
      isGrounded.current = false;
    }

    // Apply gravity
    if (!isGrounded.current) {
      velocity.current.y -= gravity;
    }

    // Store current position before movement
    const currentPosition = meshRef.current.position.clone();
    const proposedPosition = currentPosition.clone().add(velocity.current);

    // Check for collisions with the new position
    const collision = checkWallCollision(currentPosition, proposedPosition);

    if (collision.collided) {
      if (collision.safePosition) {
        // Use the safe position calculated by collision detection
        meshRef.current.position.copy(collision.safePosition);
      }
    } else {
      // No collision, move normally
      meshRef.current.position.copy(proposedPosition);
    }

    // Ground collision check
    if (meshRef.current.position.y <= 1) {
      meshRef.current.position.y = 1;
      velocity.current.y = 0;
      isGrounded.current = true;
    }
  });

  // Handle left click to fire missile
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      // Only handle left clicks
      if (event.button !== 0) return;

      if (!meshRef.current) return;

      // Get character's forward direction
      const matrix = new Matrix4();
      matrix.extractRotation(meshRef.current.matrix);
      const forwardVector = new Vector3(0, 0, 1).applyMatrix4(matrix);

      // Create new missile
      const missilePosition = meshRef.current.position
        .clone()
        .add(new Vector3(0, 1, 0));
      setMissiles((prev) => [
        ...prev,
        {
          id: nextMissileId.current++,
          position: missilePosition,
          direction: forwardVector,
        },
      ]);
    };

    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  // Handle missile hits
  const handleMissileHit = useCallback((missileId: number) => {
    setMissiles((prev) => prev.filter((missile) => missile.id !== missileId));
  }, []);

  return (
    <>
      <mesh
        ref={meshRef}
        position={[0, 1, 0]}
        name="character"
        castShadow
        receiveShadow
      >
        {!modelError && crocodiloScene ? (
          <primitive
            object={crocodiloScene.clone()}
            scale={[3, 3, 3]}
            rotation={[0, 0, 0]}
          />
        ) : (
          // Fallback geometry when model fails to load
          <group>
            <mesh position={[0, 0, 0.5]}>
              <boxGeometry args={[1, 2, 0.1]} />
              <meshStandardMaterial color="hotpink" />
            </mesh>
            <mesh position={[0, 0, -0.5]}>
              <boxGeometry args={[1, 2, 0.1]} />
              <meshStandardMaterial color="yellow" />
            </mesh>
            <mesh position={[0.5, 0, 0]}>
              <boxGeometry args={[0.1, 2, 0.9]} />
              <meshStandardMaterial color="hotpink" />
            </mesh>
            <mesh position={[-0.5, 0, 0]}>
              <boxGeometry args={[0.1, 2, 0.9]} />
              <meshStandardMaterial color="hotpink" />
            </mesh>
          </group>
        )}
      </mesh>
      {missiles.map((missile) => (
        <Missile
          key={missile.id}
          position={missile.position}
          direction={missile.direction}
          onHit={() => handleMissileHit(missile.id)}
        />
      ))}
    </>
  );
}

// Preload the model
try {
  useGLTF.preload("/models/characters/BombardinoCrocodilo.glb");
} catch (error) {
  console.error("Error preloading model:", error);
}
