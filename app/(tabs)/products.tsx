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
import { parseProductsFromFile, exportProductsToExcel } from '@/utils/excel';

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
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

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

  const handleImport = async () => {
    if (importing) return;
    setImporting(true);
    try {
      const DocumentPicker = await import('expo-document-picker');
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'text/csv',
          'text/plain',
          '*/*',
        ],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets?.length) {
        setImporting(false);
        return;
      }

      const asset = result.assets[0];
      const names = await parseProductsFromFile(
        asset.uri,
        (asset as any).file
      );

      if (names.length === 0) {
        Alert.alert('Пусто', 'Не найдено названий в первом столбце файла.');
        setImporting(false);
        return;
      }

      const existing = new Set(products.map((p) => p.name.toLowerCase()));
      const newNames = names.filter((n) => !existing.has(n.toLowerCase()));

      if (newNames.length === 0) {
        Alert.alert('Уже добавлено', 'Все позиции из файла уже есть в списке.');
        setImporting(false);
        return;
      }

      await Promise.all(newNames.map((n) => push(ref(db, 'products'), n)));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Готово', `Импортировано: ${newNames.length} позиций`);
    } catch (e) {
      Alert.alert('Ошибка', 'Не удалось импортировать файл');
    }
    setImporting(false);
  };

  const handleExport = async () => {
    if (exporting || products.length === 0) return;
    setExporting(true);
    try {
      await exportProductsToExcel(products);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Ошибка', 'Не удалось экспортировать данные');
    }
    setExporting(false);
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
              <View style={styles.headerRow}>
                <View>
                  <Text style={styles.screenTitle}>Продукция</Text>
                  <Text style={styles.screenSubtitle}>
                    {products.length} позиций
                  </Text>
                </View>
                {isManager && (
                  <View style={styles.headerActions}>
                    <Pressable
                      onPress={handleImport}
                      style={[styles.headerBtn, styles.importBtn]}
                      hitSlop={8}
                      disabled={importing}
                    >
                      {importing ? (
                        <ActivityIndicator size="small" color={Colors.accent} />
                      ) : (
                        <Ionicons name="cloud-upload-outline" size={20} color={Colors.accent} />
                      )}
                    </Pressable>
                    <Pressable
                      onPress={handleExport}
                      style={[styles.headerBtn, styles.exportBtn]}
                      hitSlop={8}
                      disabled={exporting || products.length === 0}
                    >
                      {exporting ? (
                        <ActivityIndicator size="small" color={Colors.success} />
                      ) : (
                        <Ionicons name="download-outline" size={20} color={Colors.success} />
                      )}
                    </Pressable>
                  </View>
                )}
              </View>
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

                <View style={styles.importExportRow}>
                  <Pressable
                    style={[styles.fileBtn, styles.fileBtnImport]}
                    onPress={handleImport}
                    disabled={importing}
                  >
                    {importing ? (
                      <ActivityIndicator size="small" color={Colors.accent} />
                    ) : (
                      <Ionicons name="cloud-upload-outline" size={16} color={Colors.accent} />
                    )}
                    <Text style={[styles.fileBtnText, { color: Colors.accent }]}>
                      {importing ? 'Импорт...' : 'Импорт из Excel'}
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.fileBtn,
                      styles.fileBtnExport,
                      (exporting || products.length === 0) && styles.fileBtnDisabled,
                    ]}
                    onPress={handleExport}
                    disabled={exporting || products.length === 0}
                  >
                    {exporting ? (
                      <ActivityIndicator size="small" color={Colors.success} />
                    ) : (
                      <Ionicons name="download-outline" size={16} color={Colors.success} />
                    )}
                    <Text style={[styles.fileBtnText, { color: Colors.success }]}>
                      {exporting ? 'Экспорт...' : 'Экспорт в Excel'}
                    </Text>
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
              <Text style={styles.emptySubText}>Добавьте вручную или импортируйте из Excel</Text>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 4,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  importBtn: {
    backgroundColor: 'rgba(249,115,22,0.1)',
    borderColor: 'rgba(249,115,22,0.3)',
  },
  exportBtn: {
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderColor: 'rgba(16,185,129,0.3)',
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
  importExportRow: {
    flexDirection: 'row',
    gap: 10,
  },
  fileBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  fileBtnImport: {
    backgroundColor: 'rgba(249,115,22,0.08)',
    borderColor: 'rgba(249,115,22,0.3)',
  },
  fileBtnExport: {
    backgroundColor: 'rgba(16,185,129,0.08)',
    borderColor: 'rgba(16,185,129,0.3)',
  },
  fileBtnDisabled: {
    opacity: 0.4,
  },
  fileBtnText: {
    fontFamily: 'Rubik_600SemiBold',
    fontSize: 13,
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
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
