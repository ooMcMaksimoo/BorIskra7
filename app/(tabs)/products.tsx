import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  FlatList,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { ref, push, remove } from 'firebase/database';
import { db, useApp } from '@/context/AppContext';
import Colors from '@/constants/colors';

function ProductItem({
  name,
  canDelete,
  onDelete,
}: {
  name: string;
  canDelete: boolean;
  onDelete: () => void;
}) {
  return (
    <Animated.View
      entering={FadeInRight.springify()}
      style={styles.productItem}
    >
      <View style={styles.productIconWrap}>
        <Ionicons name="cube" size={18} color={Colors.accent} />
      </View>
      <Text style={styles.productName} numberOfLines={1}>
        {name}
      </Text>
      {canDelete && (
        <Pressable onPress={onDelete} hitSlop={8} style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={16} color={Colors.error} />
        </Pressable>
      )}
    </Animated.View>
  );
}

export default function ProductsScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser, products } = useApp();
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  const isManager = currentUser?.role === 'manager';
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const handleAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setAdding(true);
    try {
      await push(ref(db, 'products'), trimmed);
      setNewName('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    setAdding(false);
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert(`Удалить "${name}"?`, 'Это действие необратимо.', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: () => {
          remove(ref(db, `products/${id}`));
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={products}
        keyExtractor={(p) => p.id}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        renderScrollComponent={(props) => <KeyboardAwareScrollView {...props} />}
        ListHeaderComponent={
          <View>
            <LinearGradient
              colors={[Colors.background, Colors.surface]}
              style={[styles.header, { paddingTop: topPad + 12 }]}
            >
              <Text style={styles.screenTitle}>Продукция</Text>
              <Text style={styles.screenSubtitle}>
                {products.length} позиций
              </Text>
            </LinearGradient>

            {isManager && (
              <Animated.View
                entering={FadeInDown.delay(100).springify()}
                style={styles.addSection}
              >
                <Text style={styles.sectionTitle}>Добавить</Text>
                <View style={styles.addRow}>
                  <View style={styles.inputWrapper}>
                    <Ionicons
                      name="cube-outline"
                      size={18}
                      color={Colors.textMuted}
                      style={{ marginRight: 8 }}
                    />
                    <TextInput
                      style={styles.input}
                      value={newName}
                      onChangeText={setNewName}
                      placeholder="Название продукции"
                      placeholderTextColor={Colors.textMuted}
                      autoCapitalize="words"
                      returnKeyType="done"
                      onSubmitEditing={handleAdd}
                    />
                  </View>
                  <Pressable
                    style={[styles.addBtn, (!newName.trim() || adding) && styles.addBtnDisabled]}
                    onPress={handleAdd}
                    disabled={!newName.trim() || adding}
                  >
                    {adding ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Ionicons name="add" size={24} color="#fff" />
                    )}
                  </Pressable>
                </View>
              </Animated.View>
            )}

            <View style={styles.listHeader}>
              <Text style={styles.sectionTitle}>Список</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>Нет продукции</Text>
            {isManager && (
              <Text style={styles.emptySubText}>Добавьте продукцию выше</Text>
            )}
          </View>
        }
        contentContainerStyle={{ paddingBottom: bottomPad + 100 }}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(index * 40).springify()}>
            <ProductItem
              name={item.name}
              canDelete={isManager}
              onDelete={() => handleDelete(item.id, item.name)}
            />
          </Animated.View>
        )}
      />

      {!isManager && (
        <View style={[styles.readonlyBanner, { bottom: bottomPad + 90 }]}>
          <Ionicons name="lock-closed" size={13} color={Colors.textMuted} />
          <Text style={styles.readonlyText}>Только для просмотра</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  screenTitle: {
    fontFamily: 'Rubik_700Bold',
    fontSize: 28,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontFamily: 'Rubik_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  addSection: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    borderRadius: 20,
    marginBottom: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: {
    fontFamily: 'Rubik_700Bold',
    fontSize: 16,
    color: Colors.text,
  },
  addRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    height: 50,
  },
  input: {
    flex: 1,
    fontFamily: 'Rubik_400Regular',
    fontSize: 15,
    color: Colors.text,
    height: '100%',
  },
  addBtn: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  addBtnDisabled: {
    opacity: 0.5,
  },
  listHeader: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  productIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(249,115,22,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productName: {
    flex: 1,
    fontFamily: 'Rubik_600SemiBold',
    fontSize: 15,
    color: Colors.text,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(239,68,68,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    paddingTop: 48,
    alignItems: 'center',
    gap: 10,
  },
  emptyText: {
    fontFamily: 'Rubik_600SemiBold',
    fontSize: 16,
    color: Colors.textMuted,
  },
  emptySubText: {
    fontFamily: 'Rubik_400Regular',
    fontSize: 13,
    color: Colors.textMuted,
  },
  readonlyBanner: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  readonlyText: {
    fontFamily: 'Rubik_400Regular',
    fontSize: 12,
    color: Colors.textMuted,
  },
});
