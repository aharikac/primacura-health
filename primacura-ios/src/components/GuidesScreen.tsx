import { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, TextInput } from 'react-native';
import { ArrowLeft, ArrowRight, Search } from 'lucide-react-native';
import { Condition } from '../types';
import { conditions } from '../data/conditions';

export function GuidesScreen({
  query,
  setQuery,
  onBack,
  onOpenProtocol,
}: {
  query: string;
  setQuery: (value: string) => void;
  onBack: () => void;
  onOpenProtocol: (condition: Condition) => void;
}) {
  const filteredConditions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return conditions;
    return conditions.filter(({ title, description }) => 
      `${title} ${description}`.toLowerCase().includes(normalizedQuery)
    );
  }, [query]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity style={styles.navBackBtn} onPress={onBack} accessibilityLabel="Back to home">
            <View style={styles.navIconCircle}>
              <ArrowLeft size={20} strokeWidth={2.8} color="#050505" />
            </View>
            <Text style={styles.navBackText}>Home</Text>
          </TouchableOpacity>
          
          <View style={styles.innerBrand}>
            <Text style={styles.innerBrandTitle}>PrimaCura</Text>
            <Text style={styles.innerBrandSlogan}>The First Care</Text>
          </View>
        </View>

        <View style={styles.headerTitleRow}>
          <Text style={styles.title}>First-Aid Guides</Text>
          <Text style={styles.subtitle}>Select a condition to view its protocol.</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Search color="#9ca3af" size={20} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search guides..."
          placeholderTextColor="#9ca3af"
          clearButtonMode="while-editing"
        />
      </View>

      <ScrollView style={styles.guideList} showsVerticalScrollIndicator={false}>
        {filteredConditions.length > 0 ? (
          filteredConditions.map((condition) => (
            <TouchableOpacity 
              key={condition.title} 
              style={styles.guideRow} 
              onPress={() => onOpenProtocol(condition)}
            >
              <View style={styles.guideTextContainer}>
                <Text style={styles.guideTitle}>{condition.title}</Text>
                <Text style={styles.guideDesc}>{condition.description}</Text>
              </View>
              <ArrowRight size={24} strokeWidth={2.8} color="#d33b32" />
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>NO GUIDES{"\n"}FOUND</Text>
            <Text style={styles.emptyStateText}>Try a different search{"\n"}term.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  navBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navIconCircle: {
    backgroundColor: '#f4f4f5',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBackText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#050505',
  },
  innerBrand: {
    alignItems: 'flex-end',
  },
  innerBrandTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#050505',
    letterSpacing: -0.5,
  },
  innerBrandSlogan: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  headerTitleRow: {
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#050505',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f4f4f5',
    marginHorizontal: 20,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '500',
    color: '#050505',
  },
  guideList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  guideRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fffafa',
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#d33b32',
    shadowColor: '#d33b32',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  guideTextContainer: {
    flex: 1,
    paddingRight: 16,
  },
  guideTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#050505',
    marginBottom: 4,
  },
  guideDesc: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#d1d5db',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 28,
  },
  emptyStateText: {
    fontSize: 15,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 22,
  },
});