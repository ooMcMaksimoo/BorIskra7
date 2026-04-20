import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '@/context/AppContext';
import Colors from '@/constants/colors';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser, login } = useApp();
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const pinRef = useRef<TextInput>(null);
  const shakeX = useSharedValue(0);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  useEffect(() => {
    if (currentUser) {
      router.replace('/(tabs)/records');
    }
  }, [currentUser]);

  useEffect(() => {
    AsyncStorage.getItem('boriskra_lastName').then((saved) => {
      if (saved) setName(saved);
    });
  }, []);

  const shake = () => {
    shakeX.value = withSequence(
      withTiming(-8, { duration: 60 }),
      withTiming(8, { duration: 60 }),
      withTiming(-6, { duration: 60 }),
      withTiming(6, { duration: 60 }),
      withTiming(0, { duration: 60 })
    );
  };

  const handleLogin = async () => {
    const trimmedName = name.trim();
    const trimmedPin = pin.trim();

    if (!trimmedName) {
      setError('Введите ваше имя');
      shake();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    if (!trimmedPin) {
      setError('Введите ПИН-код');
      shake();
      pinRef.current?.focus();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setError('');
    setLoading(true);
    const result = await login(trimmedName, trimmedPin);
    setLoading(false);

    if (result === 'ok') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)/records');
    } else {
      setError('Неверное имя или ПИН-код');
      setPin('');
      shake();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { paddingTop: topPad, paddingBottom: bottomPad + 20 }]}>
      <LinearGradient
        colors={['#0B1120', '#162032', '#0B1120']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <Animated.View entering={FadeIn.duration(600)} style={styles.header}>
        <View style={styles.sparkIcon}>
          <Ionicons name="flash" size={36} color={Colors.accent} />
        </View>
        <Text style={styles.appName}>БорИскра</Text>
        <Text style={styles.appSubtitle}>УЧЁТ СВАРКИ</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.form}>
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Ваше имя</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="person-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={(v) => { setName(v); setError(''); }}
              placeholder="Введите имя"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => pinRef.current?.focus()}
            />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>ПИН-код</Text>
          <Animated.View style={[styles.inputWrapper, shakeStyle, error && styles.inputWrapperError]}>
            <Ionicons name="lock-closed-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              ref={pinRef}
              style={styles.input}
              value={pin}
              onChangeText={(v) => { setPin(v); setError(''); }}
              placeholder="••••"
              placeholderTextColor={Colors.textMuted}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
          </Animated.View>
        </View>

        {!!error && (
          <Animated.View entering={FadeIn.duration(200)} style={styles.errorBox}>
            <Ionicons name="alert-circle" size={14} color={Colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <Pressable
            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="flash" size={20} color="#fff" />
                <Text style={styles.loginBtnText}>Войти</Text>
              </>
            )}
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(400)}>
          <Text style={styles.hint}>
            Первый вход: используйте ПИН <Text style={styles.hintPin}>1234</Text>
          </Text>
        </Animated.View>
      </Animated.View>

      <Animated.View entering={FadeIn.delay(600)} style={styles.footer}>
        <Text style={styles.footerText}>сделано с огнём</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 24,
    justifyContent: 'center',
    gap: 32,
  },
  header: {
    alignItems: 'center',
    gap: 8,
  },
  sparkIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: 'rgba(249,115,22,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.2)',
  },
  appName: {
    fontFamily: 'Rubik_700Bold',
    fontSize: 36,
    color: Colors.accent,
    letterSpacing: -1,
  },
  appSubtitle: {
    fontFamily: 'Rubik_400Regular',
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  form: {
    gap: 14,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontFamily: 'Rubik_600SemiBold',
    fontSize: 13,
    color: Colors.textSecondary,
    marginLeft: 4,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    height: 56,
  },
  inputWrapperError: {
    borderColor: Colors.error,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontFamily: 'Rubik_400Regular',
    fontSize: 16,
    color: Colors.text,
    height: '100%',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  errorText: {
    fontFamily: 'Rubik_400Regular',
    fontSize: 13,
    color: Colors.error,
  },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 16,
    height: 56,
    backgroundColor: Colors.accent,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
    marginTop: 4,
  },
  loginBtnDisabled: {
    opacity: 0.7,
  },
  loginBtnText: {
    fontFamily: 'Rubik_600SemiBold',
    fontSize: 16,
    color: '#fff',
  },
  hint: {
    fontFamily: 'Rubik_400Regular',
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  hintPin: {
    fontFamily: 'Rubik_600SemiBold',
    color: Colors.textSecondary,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontFamily: 'Rubik_400Regular',
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
});
