import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  FlatList,
  Platform,
  Modal,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { ref, push, onValue, remove, update, query, limitToLast, get } from 'firebase/database';
import { db, useApp } from '@/context/AppContext';
import Colors from '@/constants/colors';
import { exportRecordsToExcel, RecordExport } from '@/utils/excel';

interface Record {
  id: string;
  date: string;
  timestamp: number;
  user: string;
  role: string;
  product: string;
  qty: number;
  comment?: string;
}

function ProductSelector({
  products,
  value,
  onChange,
}: {
  products: { id: string; name: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        style={[styles.selector, value ? styles.selectorSelected : {}]}
        onPress={() => setOpen(true)}
      >
        <Ionicons
          name="cube-outline"
          size={18}
          color={value ? Colors.accent : Colors.textMuted}
          style={{ marginRight: 8 }}
        />
        <Text
          style={[styles.selectorText, value ? styles.selectorTextSelected : {}]}
          numberOfLines={1}
        >
          {value || 'Выберите продукцию'}
        </Text>
        <Ionicons name="chevron-down" size={16} color={Colors.textMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.pickerOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHandle} />
            <Text style={styles.pickerTitle}>Продукция</Text>
            <FlatList
              data={products}
              keyExtractor={(p) => p.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.pickerItem, item.name === value && styles.pickerItemActive]}
                  onPress={() => {
                    onChange(item.name);
                    setOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerItemText,
                      item.name === value && styles.pickerItemTextActive,
                    ]}
                  >
                    {item.name}
                  </Text>
                  {item.name === value && (
                    <Ionicons name="checkmark" size={18} color={Colors.accent} />
                  )}
                </Pressable>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyPickerText}>Нет продукции. Добавьте в разделе "Продукция"</Text>
              }
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

function RecordCard({
  record,
  canEdit,
  onEdit,
  onDelete,
}: {
  record: Record;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Animated.View entering={FadeInDown.springify()}>
      <View style={styles.card}>
        <View style={styles.cardAccent} />
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.cardMeta}>
              <Ionicons name="time-outline" size={12} color={Colors.textMuted} />
              <Text style={styles.cardDate}>{record.date}</Text>
              <Text style={styles.cardSep}>·</Text>
              <Ionicons name="person-outline" size={12} color={Colors.textMuted} />
              <Text style={styles.cardUser}>{record.user}</Text>
              {record.role === 'manager' && (
                <View style={styles.managerBadge}>
                  <Text style={styles.managerBadgeText}>рук</Text>
                </View>
              )}
            </View>
            {canEdit && (
              <View style={styles.cardActions}>
                <Pressable
                  onPress={onEdit}
                  style={styles.iconBtn}
                  hitSlop={8}
                >
                  <Ionicons name="pencil" size={15} color={Colors.textSecondary} />
                </Pressable>
                <Pressable
                  onPress={onDelete}
                  style={styles.iconBtn}
                  hitSlop={8}
                >
                  <Ionicons name="trash-outline" size={15} color={Colors.error} />
                </Pressable>
              </View>
            )}
          </View>

          <Text style={styles.cardProduct}>{record.product}</Text>

          <View style={styles.cardFooter}>
            <View style={styles.qtyBadge}>
              <Ionicons name="layers-outline" size={13} color="#000" />
              <Text style={styles.qtyText}>{record.qty} шт</Text>
            </View>
            {!!record.comment && (
              <Text style={styles.cardComment} numberOfLines={2}>
                {record.comment}
              </Text>
            )}
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

function EditModal({
  record,
  visible,
  onClose,
  onSave,
}: {
  record: Record | null;
  visible: boolean;
  onClose: () => void;
  onSave: (qty: number, comment: string) => void;
}) {
  const [qty, setQty] = useState('');
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (record) {
      setQty(String(record.qty));
      setComment(record.comment || '');
    }
  }, [record]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.editModal} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.editModalTitle}>Редактировать</Text>

          <Text style={styles.editLabel}>Количество</Text>
          <TextInput
            style={styles.editInput}
            value={qty}
            onChangeText={setQty}
            keyboardType="number-pad"
            placeholder="Количество, шт"
            placeholderTextColor={Colors.textMuted}
            returnKeyType="next"
          />

          <Text style={styles.editLabel}>Комментарий</Text>
          <TextInput
            style={[styles.editInput, styles.editInputMulti]}
            value={comment}
            onChangeText={setComment}
            placeholder="Необязательно"
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={3}
            returnKeyType="done"
          />

          <View style={styles.editButtons}>
            <Pressable style={styles.editBtnCancel} onPress={onClose}>
              <Text style={styles.editBtnCancelText}>Отмена</Text>
            </Pressable>
            <Pressable
              style={styles.editBtnSave}
              onPress={() => {
                const n = parseInt(qty, 10);
                if (!isNaN(n) && n > 0) {
                  onSave(n, comment.trim());
                }
              }}
            >
              <Ionicons name="checkmark" size={16} color="#fff" />
              <Text style={styles.editBtnSaveText}>Сохранить</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function RecordsScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser, products, logout } = useApp();

  const [selectedProduct, setSelectedProduct] = useState('');
  const [qty, setQty] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [records, setRecords] = useState<Record[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [editRecord, setEditRecord] = useState<Record | null>(null);
  const [editVisible, setEditVisible] = useState(false);
  const [exporting, setExporting] = useState(false);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  useEffect(() => {
    if (!currentUser) return;
    const q = query(ref(db, 'records'), limitToLast(100));
    const unsub = onValue(q, (snap) => {
      const list: Record[] = [];
      snap.forEach((child) => {
        list.push({ id: child.key!, ...(child.val() as Omit<Record, 'id'>) });
      });
      list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      setRecords(list);
      setLoadingRecords(false);
      setRefreshing(false);
    });
    return () => unsub();
  }, [currentUser]);

  const handleSubmit = async () => {
    if (!selectedProduct) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    const n = parseInt(qty, 10);
    if (isNaN(n) || n <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setSubmitting(true);
    try {
      await push(ref(db, 'records'), {
        date: new Date().toLocaleString('ru-RU'),
        timestamp: Date.now(),
        user: currentUser!.name,
        role: currentUser!.role,
        product: selectedProduct,
        qty: n,
        comment: comment.trim(),
      });
      setSelectedProduct('');
      setQty('');
      setComment('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    setSubmitting(false);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Удалить запись?', 'Это действие необратимо.', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: () => {
          remove(ref(db, `records/${id}`));
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        },
      },
    ]);
  };

  const handleSaveEdit = async (newQty: number, newComment: string) => {
    if (!editRecord) return;
    await update(ref(db, `records/${editRecord.id}`), { qty: newQty, comment: newComment });
    setEditVisible(false);
    setEditRecord(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const snap = await get(ref(db, 'records'));
      const all: RecordExport[] = [];
      snap.forEach((child) => {
        all.push({ id: child.key!, ...(child.val() as Omit<RecordExport, 'id'>) });
      });
      all.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      await exportRecordsToExcel(all);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      Alert.alert('Ошибка', 'Не удалось экспортировать данные');
    }
    setExporting(false);
  };

  const renderRecord = useCallback(
    ({ item }: { item: Record }) => {
      const canEdit =
        currentUser?.role === 'manager' || currentUser?.name === item.user;
      return (
        <RecordCard
          record={item}
          canEdit={!!canEdit}
          onEdit={() => {
            setEditRecord(item);
            setEditVisible(true);
          }}
          onDelete={() => handleDelete(item.id)}
        />
      );
    },
    [currentUser]
  );

  const ListHeader = (
    <View>
      <LinearGradient
        colors={[Colors.background, Colors.surface]}
        style={[styles.headerGradient, { paddingTop: topPad }]}
      >
        <View style={styles.topRow}>
          <View>
            <Text style={styles.screenTitle}>Записи</Text>
            <Text style={styles.screenSubtitle}>{currentUser?.name}</Text>
          </View>
          <View style={styles.topActions}>
            {currentUser?.role === 'manager' && (
              <Pressable
                onPress={handleExport}
                style={[styles.actionBtn, styles.exportBtn]}
                hitSlop={8}
                disabled={exporting}
              >
                {exporting ? (
                  <ActivityIndicator size="small" color={Colors.success} />
                ) : (
                  <Ionicons name="download-outline" size={20} color={Colors.success} />
                )}
              </Pressable>
            )}
            <Pressable onPress={logout} style={styles.logoutBtn} hitSlop={8}>
              <Ionicons name="log-out-outline" size={22} color={Colors.textMuted} />
            </Pressable>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Новая запись</Text>

        <ProductSelector
          products={products}
          value={selectedProduct}
          onChange={setSelectedProduct}
        />

        <View style={styles.row}>
          <View style={[styles.inputWrapper, { flex: 1 }]}>
            <Ionicons name="layers-outline" size={17} color={Colors.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.input}
              value={qty}
              onChangeText={setQty}
              placeholder="Кол-во, шт"
              placeholderTextColor={Colors.textMuted}
              keyboardType="number-pad"
              returnKeyType="done"
            />
          </View>
        </View>

        <View style={styles.inputWrapper}>
          <Ionicons name="chatbubble-outline" size={17} color={Colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.input, { height: 56 }]}
            value={comment}
            onChangeText={setComment}
            placeholder="Комментарий (необязательно)"
            placeholderTextColor={Colors.textMuted}
            multiline
            returnKeyType="done"
          />
        </View>

        <Pressable
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="flash" size={18} color="#fff" />
              <Text style={styles.submitBtnText}>Зафиксировать</Text>
            </>
          )}
        </Pressable>
      </View>

      <View style={styles.listHeaderRow}>
        <Text style={styles.sectionTitle}>История</Text>
        <Text style={styles.recordCount}>{records.length} записей</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={records}
        keyExtractor={(r) => r.id}
        renderItem={renderRecord}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          loadingRecords ? (
            <View style={styles.emptyState}>
              <ActivityIndicator color={Colors.accent} />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="document-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>Нет записей</Text>
            </View>
          )
        }
        contentContainerStyle={{ paddingBottom: bottomPad + 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => setRefreshing(true)}
            tintColor={Colors.accent}
          />
        }
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        renderScrollComponent={(props) => <KeyboardAwareScrollView {...props} />}
      />

      <EditModal
        record={editRecord}
        visible={editVisible}
        onClose={() => {
          setEditVisible(false);
          setEditRecord(null);
        }}
        onSave={handleSaveEdit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerGradient: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
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
    marginTop: 2,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  exportBtn: {
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderColor: 'rgba(16,185,129,0.3)',
  },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  formSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 10,
  },
  sectionTitle: {
    fontFamily: 'Rubik_700Bold',
    fontSize: 16,
    color: Colors.text,
    marginBottom: 4,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    height: 52,
  },
  selectorSelected: {
    borderColor: Colors.accent,
  },
  selectorText: {
    flex: 1,
    fontFamily: 'Rubik_400Regular',
    fontSize: 15,
    color: Colors.textMuted,
  },
  selectorTextSelected: {
    color: Colors.text,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    height: 52,
  },
  input: {
    flex: 1,
    fontFamily: 'Rubik_400Regular',
    fontSize: 15,
    color: Colors.text,
    height: '100%',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.accent,
    borderRadius: 14,
    height: 52,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontFamily: 'Rubik_700Bold',
    fontSize: 16,
    color: '#fff',
    letterSpacing: 0.3,
  },
  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  recordCount: {
    fontFamily: 'Rubik_400Regular',
    fontSize: 13,
    color: Colors.textMuted,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 10,
    overflow: 'hidden',
  },
  cardAccent: {
    width: 4,
    backgroundColor: Colors.accent,
  },
  cardContent: {
    flex: 1,
    padding: 14,
    gap: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
    flex: 1,
  },
  cardDate: {
    fontFamily: 'Rubik_400Regular',
    fontSize: 11,
    color: Colors.textMuted,
  },
  cardSep: {
    color: Colors.textMuted,
    fontSize: 11,
  },
  cardUser: {
    fontFamily: 'Rubik_600SemiBold',
    fontSize: 11,
    color: Colors.textSecondary,
  },
  managerBadge: {
    backgroundColor: Colors.success,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  managerBadgeText: {
    fontFamily: 'Rubik_600SemiBold',
    fontSize: 9,
    color: '#fff',
    textTransform: 'uppercase',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 2,
  },
  iconBtn: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  cardProduct: {
    fontFamily: 'Rubik_700Bold',
    fontSize: 16,
    color: Colors.text,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  qtyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  qtyText: {
    fontFamily: 'Rubik_700Bold',
    fontSize: 12,
    color: '#000',
  },
  cardComment: {
    fontFamily: 'Rubik_400Regular',
    fontSize: 12,
    color: Colors.textSecondary,
    flex: 1,
  },
  emptyState: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontFamily: 'Rubik_400Regular',
    fontSize: 15,
    color: Colors.textMuted,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingBottom: 40,
    maxHeight: '60%',
  },
  pickerHandle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.borderLight,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  pickerTitle: {
    fontFamily: 'Rubik_700Bold',
    fontSize: 18,
    color: Colors.text,
    marginBottom: 12,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pickerItemActive: {
    borderBottomColor: Colors.accent,
  },
  pickerItemText: {
    fontFamily: 'Rubik_400Regular',
    fontSize: 15,
    color: Colors.text,
  },
  pickerItemTextActive: {
    fontFamily: 'Rubik_600SemiBold',
    color: Colors.accent,
  },
  emptyPickerText: {
    fontFamily: 'Rubik_400Regular',
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  editModal: {
    backgroundColor: Colors.card,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  editModalTitle: {
    fontFamily: 'Rubik_700Bold',
    fontSize: 20,
    color: Colors.text,
    marginBottom: 4,
  },
  editLabel: {
    fontFamily: 'Rubik_600SemiBold',
    fontSize: 12,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  editInput: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    fontFamily: 'Rubik_400Regular',
    fontSize: 16,
    color: Colors.text,
    paddingHorizontal: 14,
    height: 50,
  },
  editInputMulti: {
    height: 80,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  editButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  editBtnCancel: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  editBtnCancelText: {
    fontFamily: 'Rubik_600SemiBold',
    fontSize: 15,
    color: Colors.textSecondary,
  },
  editBtnSave: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.accent,
  },
  editBtnSaveText: {
    fontFamily: 'Rubik_600SemiBold',
    fontSize: 15,
    color: '#fff',
  },
});
