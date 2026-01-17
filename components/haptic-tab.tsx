import { Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';

export function HapticTab(props: any) {
  const focused = props.accessibilityState?.selected;

  return (
    <Pressable
      {...props}
      onPressIn={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }}
      style={[
        props.style,
        {
          opacity: focused ? 1 : 0.7, // ✅ now valid
        },
      ]}
    />
  );
}
