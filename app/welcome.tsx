import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/lib/theme-context';

export default function Welcome() {
  const router = useRouter();
  const Colors = useColors();
  const insets = useSafeAreaInsets();

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: Colors.background, paddingTop: topInset, paddingBottom: bottomInset + 24 }]}>
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: Colors.surfaceElevated }]}>
          <Ionicons name="flash" size={48} color={Colors.text} />
        </View>
        <Text style={[styles.title, { color: Colors.text }]}>Perform AI</Text>
        <Text style={[styles.subtitle, { color: Colors.textSecondary }]}>Structured performance, simplified.</Text>
      </View>

      <View style={styles.buttons}>
        <Pressable
          style={[styles.primaryButton, { backgroundColor: Colors.text }]}
          onPress={() => router.push('/auth/sign-up')}
        >
          <Text style={[styles.primaryButtonText, { color: Colors.background }]}>Create Account</Text>
        </Pressable>

        <Pressable
          style={[styles.secondaryButton, { borderColor: Colors.border }]}
          onPress={() => router.push('/auth/sign-in')}
        >
          <Text style={[styles.secondaryButtonText, { color: Colors.text }]}>Sign In</Text>
        </Pressable>

        <Text style={[styles.legalText, { color: Colors.textTertiary }]}>
          By continuing you agree to our{' '}
          <Text style={styles.legalLink}>Terms of Service</Text> and{' '}
          <Text style={styles.legalLink}>Privacy Policy</Text>.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400' as const,
    letterSpacing: 0.2,
  },
  buttons: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '600' as const,
  },
  secondaryButton: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 17,
    fontWeight: '600' as const,
  },
  legalText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 4,
  },
  legalLink: {
    textDecorationLine: 'underline',
  },
});
