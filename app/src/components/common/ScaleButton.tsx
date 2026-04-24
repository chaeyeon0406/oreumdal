import React, { useRef } from 'react';
import { Animated, TouchableWithoutFeedback, ViewStyle } from 'react-native';

interface Props {
  onPress?: () => void;
  disabled?: boolean;
  style?: any;
  children: React.ReactNode;
}

export default function ScaleButton({ onPress, disabled, style, children }: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () =>
    Animated.timing(scale, { toValue: 0.97, duration: 100, useNativeDriver: true }).start();

  const pressOut = () =>
    Animated.timing(scale, { toValue: 1, duration: 100, useNativeDriver: true }).start();

  return (
    <TouchableWithoutFeedback
      onPress={disabled ? undefined : onPress}
      onPressIn={disabled ? undefined : pressIn}
      onPressOut={disabled ? undefined : pressOut}
    >
      <Animated.View style={[style, { transform: [{ scale }], opacity: disabled ? 0.4 : 1 }]}>
        {children}
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}
