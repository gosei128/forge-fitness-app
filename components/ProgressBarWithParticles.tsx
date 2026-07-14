import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  withTiming,
  withDelay,
  useAnimatedStyle,
  Easing,
} from "react-native-reanimated";
import AnimatedProgressBar from "./AnimatedProgressBar";

// Simple particle definition
type Particle = {
  id: number;
  offsetX: number;
  offsetY: number;
  size: number;
  color: string;
};

/**
 * Individual particle item to avoid React hook rule violations.
 */
const ParticleItem = ({ p }: { p: Particle }) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(0);

  useEffect(() => {
    // Animate particle outwards
    translateX.value = withTiming(p.offsetX, {
      duration: 800,
      easing: Easing.out(Easing.quad),
    });
    translateY.value = withTiming(p.offsetY, {
      duration: 800,
      easing: Easing.out(Easing.quad),
    });
    scale.value = withTiming(1, {
      duration: 400,
      easing: Easing.out(Easing.quad),
    });
    // Fade out particle
    opacity.value = withDelay(400, withTiming(0, { duration: 400 }));
  }, [p]);

  const style = useAnimatedStyle(() => ({
    position: "absolute",
    left: 0,
    top: 0,
    width: p.size,
    height: p.size,
    borderRadius: p.size / 2,
    backgroundColor: p.color,
    transform: [
      { translateX: translateX.value - p.size / 2 },
      { translateY: translateY.value - p.size / 2 },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return <Animated.View style={style} />;
};

/**
 * Progress bar that shows a burst of particles at the leading edge whenever progress increases.
 */
const ProgressBarWithParticles: React.FC<{ progress: number }> = ({
  progress,
}) => {
  const prev = useRef(progress);
  const [particles, setParticles] = useState<Particle[]>([]);
  
  // Track animated progress value in sync with the progress bar animation
  const animatedWidth = useSharedValue(progress);

  // When progress goes up, generate a small set of particles at the leading edge
  useEffect(() => {
    // Animate the emitter position synchronously with the progress bar width animation
    animatedWidth.value = withTiming(progress, { duration: 1200 });

    if (progress > prev.current) {
      const newParticles: Particle[] = Array.from({ length: 8 }).map(
        (_, i) => {
          // Generate particle offsets in an upward/outward arc
          const angle = Math.PI + (Math.random() - 0.5) * Math.PI; // Upward, leftward, rightward
          const distance = 15 + Math.random() * 35; // 15px to 50px distance
          return {
            id: Date.now() + i,
            offsetX: Math.cos(angle) * distance,
            offsetY: Math.sin(angle) * distance - 5, // bias upwards
            size: 4 + Math.random() * 4, // 4px to 8px random size
            color: i % 2 === 0 ? "#f3ff47" : "#ffffff", // mix gold and white particles
          };
        }
      );
      
      // Update particles and cap the array size to prevent performance issues
      setParticles((prevParticles) => [...prevParticles, ...newParticles].slice(-24));
    }
    prev.current = progress;
  }, [progress]);

  // The emitter is placed at the leading edge of the progress bar (i.e. at width%)
  const emitterStyle = useAnimatedStyle(() => {
    return {
      position: "absolute",
      left: `${animatedWidth.value * 100}%`,
      top: "50%",
      // Offset slightly to center the particles on the tip of the progress bar
      transform: [{ translateY: -1 }], 
    };
  });

  return (
    <View style={styles.container}>
      <AnimatedProgressBar progress={progress} />
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Animated.View style={emitterStyle}>
          {particles.map((p) => (
            <ParticleItem key={p.id} p={p} />
          ))}
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "relative",
    width: "100%",
    overflow: "visible",
  },
});

export default ProgressBarWithParticles;
