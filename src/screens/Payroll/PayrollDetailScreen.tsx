import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Button, Card, LoadingOverlay } from '../../components/common';
import { supabase } from '../../api/supabase';
import { ArrowLeft, DollarSign, Calculator, Percent, TrendingDown, TrendingUp } from 'lucide-react-native';
import { formatCurrency } from '../../utils/format';

export function PayrollDetailScreen({ navigation, route }: any) {
    const { payroll } = route.params;
    const { isDark, primaryColor } = useTheme();
    const [loading, setLoading] = useState(false);

    const [bonus, setBonus] = useState(payroll.bonus?.toString() || '0');
    const [deductions, setDeductions] = useState(payroll.deductions?.toString() || '0');
    const [expenses, setExpenses] = useState(payroll.expenses_reimbursed?.toString() || '0');

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';
    const inputBorder = isDark ? '#334155' : '#e2e8f0';

    const baseSalary = parseFloat(payroll.base_salary || 0);
    const bonusVal = parseFloat(bonus || 0);
    const deductionsVal = parseFloat(deductions || 0);
    const expensesVal = parseFloat(expenses || 0);
    const totalPayout = baseSalary + bonusVal + expensesVal - deductionsVal;

    const handleSave = async () => {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('payrolls')
                .update({
                    bonus: bonusVal,
                    deductions: deductionsVal,
                    expenses_reimbursed: expensesVal,
                    total_payout: totalPayout
                })
                .eq('id', payroll.id);

            if (error) throw error;

            Alert.alert("Success", "Payroll record updated.");
            navigation.goBack();
        } catch (error: any) {
            Alert.alert("Error", error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <LoadingOverlay visible={loading} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft color={textColor} size={24} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: textColor }]}>Adjust Payroll</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.employeeInfo}>
                    <Text style={[styles.empName, { color: textColor }]}>{payroll.employees?.first_name} {payroll.employees?.last_name}</Text>
                    <Text style={{ color: mutedColor }}>Period: {payroll.period_start} to {payroll.period_end}</Text>
                </View>

                {/* Calculation breakdown */}
                <Card style={[styles.calcCard, { backgroundColor: cardBg }]}>
                    <View style={styles.calcRow}>
                        <Text style={[styles.calcLabel, { color: mutedColor }]}>Base Salary</Text>
                        <Text style={[styles.calcValue, { color: textColor }]}>{formatCurrency(baseSalary)}</Text>
                    </View>

                    <View style={styles.inputGroup}>
                        <View style={styles.labelRow}>
                            <TrendingUp size={14} color="#10b981" />
                            <Text style={[styles.inputLabel, { color: mutedColor }]}>Bonus</Text>
                        </View>
                        <TextInput
                            style={[styles.input, { borderColor: inputBorder, color: textColor }]}
                            keyboardType="numeric"
                            value={bonus}
                            onChangeText={setBonus}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <View style={styles.labelRow}>
                            <Percent size={14} color="#6366f1" />
                            <Text style={[styles.inputLabel, { color: mutedColor }]}>Expenses Reimbursed</Text>
                        </View>
                        <TextInput
                            style={[styles.input, { borderColor: inputBorder, color: textColor }]}
                            keyboardType="numeric"
                            value={expenses}
                            onChangeText={setExpenses}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <View style={styles.labelRow}>
                            <TrendingDown size={14} color="#ef4444" />
                            <Text style={[styles.inputLabel, { color: mutedColor }]}>Deductions</Text>
                        </View>
                        <TextInput
                            style={[styles.input, { borderColor: inputBorder, color: textColor }]}
                            keyboardType="numeric"
                            value={deductions}
                            onChangeText={setDeductions}
                        />
                    </View>

                    <View style={[styles.divider, { backgroundColor: inputBorder }]} />

                    <View style={styles.calcRow}>
                        <Text style={[styles.totalLabel, { color: textColor }]}>Total Payout</Text>
                        <Text style={[styles.totalValue, { color: primaryColor }]}>{formatCurrency(totalPayout)}</Text>
                    </View>
                </Card>

                <Button
                    title="Save Changes"
                    onPress={handleSave}
                    style={{ marginTop: 24 }}
                />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    backButton: { padding: 8 },
    title: { fontSize: 20, fontWeight: '700' },
    content: { padding: 20 },
    employeeInfo: { marginBottom: 24 },
    empName: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
    calcCard: { padding: 20, borderRadius: 20 },
    calcRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    calcLabel: { fontSize: 14, fontWeight: '600' },
    calcValue: { fontSize: 16, fontWeight: '700' },
    inputGroup: { marginBottom: 16 },
    labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    inputLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
    input: { height: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, fontSize: 16 },
    divider: { height: 1, marginVertical: 16 },
    totalLabel: { fontSize: 18, fontWeight: '800' },
    totalValue: { fontSize: 24, fontWeight: '800' }
});
