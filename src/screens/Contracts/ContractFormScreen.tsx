import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    Alert,
    StyleSheet,
    Image,
} from 'react-native';
import { ArrowLeft, ChevronRight, Check, FileText, User, PenTool, X } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Button, Input, Card, SignaturePadModal } from '../../components/common';
import { Client } from '../../types';
import { SvgXml } from 'react-native-svg';

interface ContractFormScreenProps {
    navigation: any;
    route: any;
}

const CONTRACT_TYPES = [
    { id: 'service_agreement', label: 'Service Agreement', description: 'Standard contract for services provided.' },
    { id: 'nda', label: 'Non-Disclosure Agreement', description: 'Protect confidential information.' },
];

export function ContractFormScreen({ navigation, route }: ContractFormScreenProps) {
    const { user } = useAuth();
    const { isDark, primaryColor } = useTheme();
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);

    // Form Data
    const [type, setType] = useState<string | null>(null);
    const [title, setTitle] = useState('');
    const [clientId, setClientId] = useState<string | null>(null);
    const [clients, setClients] = useState<Client[]>([]);
    const [answers, setAnswers] = useState<Record<string, string>>({});

    // Signatures
    const [signature, setSignature] = useState<string | null>(null);
    const [counterpartySignature, setCounterpartySignature] = useState<string | null>(null);
    const [showSignaturePad, setShowSignaturePad] = useState(false);
    const [signatureTarget, setSignatureTarget] = useState<'user' | 'counterparty'>('user');

    const bgColor = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#fff' : '#1e293b';
    const cardBg = isDark ? '#1e293b' : '#ffffff';
    const inputBg = isDark ? '#0f172a' : '#f1f5f9';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';

    useEffect(() => {
        fetchClients();
        const subtype = route.params?.subtype;
        if (subtype) {
            const foundType = CONTRACT_TYPES.find(t => t.id === subtype || (subtype === 'employment' && t.id === 'employment') || (subtype === 'collaboration' && t.id === 'service_agreement'));
            if (foundType) {
                setType(foundType.id);
                setTitle(`${foundType.label} - ${new Date().toLocaleDateString()}`);
                setStep(1);
            } else if (subtype === 'employment' || subtype === 'collaboration' || subtype === 'nda') {
                // Map or add if missing
                const label = subtype === 'employment' ? 'Employment Contract' : subtype === 'collaboration' ? 'Collaboration Contract' : 'NDA';
                const id = subtype === 'nda' ? 'nda' : subtype === 'employment' ? 'employment' : 'service_agreement';
                setType(id);
                setTitle(`${label} - ${new Date().toLocaleDateString()}`);
                setStep(1);
            }
        }
    }, [route.params?.subtype]);

    const fetchClients = async () => {
        if (!user) return;
        const { data } = await supabase.from('clients').select('*').eq('user_id', user.id);
        if (data) setClients(data);
    };

    const handleSave = async () => {
        if (!title || !clientId || !type) {
            Alert.alert('Error', 'Please complete all required fields');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.from('contracts').insert({
                user_id: user?.id,
                client_id: clientId,
                title,
                type,
                content: answers,
                status: signature && counterpartySignature ? 'signed' : 'draft',
                signature_url: signature,
                counterparty_signature_url: counterpartySignature,
            });

            if (error) throw error;
            Alert.alert('Success', 'Contract created successfully!');
            navigation.navigate('InvoicesList', { tab: 'contract' });
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const openSignaturePad = (target: 'user' | 'counterparty') => {
        setSignatureTarget(target);
        setShowSignaturePad(true);
    };

    const handleSignatureSave = (sig: string) => {
        if (signatureTarget === 'user') {
            setSignature(sig);
        } else {
            setCounterpartySignature(sig);
        }
        setShowSignaturePad(false);
    };

    const renderSignatureBox = (
        label: string,
        value: string | null,
        onSign: () => void,
        onClear: () => void
    ) => (
        <View style={styles.signatureBox}>
            <Text style={[styles.signatureLabel, { color: textColor }]}>{label}</Text>
            {value ? (
                <View style={[styles.signaturePreview, { backgroundColor: inputBg }]}>
                    {value.startsWith('data:image/svg+xml') ? (
                        <SvgXml xml={decodeURIComponent(value.split(',')[1])} width="100%" height="100%" />
                    ) : (
                        <Image source={{ uri: value }} style={styles.signatureImage} resizeMode="contain" />
                    )}
                    <TouchableOpacity style={styles.clearSignature} onPress={onClear}>
                        <X color="#fff" size={14} />
                    </TouchableOpacity>
                </View>
            ) : (
                <TouchableOpacity
                    style={[styles.signaturePlaceholder, { backgroundColor: inputBg, borderColor: primaryColor }]}
                    onPress={onSign}
                >
                    <PenTool color={primaryColor} size={24} />
                    <Text style={{ color: primaryColor, marginTop: 8, fontWeight: '600' }}>Tap to Sign</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    const renderTypeSelection = () => (
        <View>
            <Text style={[styles.stepTitle, { color: textColor }]}>Select Contract Type</Text>
            {CONTRACT_TYPES.map(t => (
                <TouchableOpacity
                    key={t.id}
                    style={[styles.typeCard, { backgroundColor: cardBg }, type === t.id && { borderColor: primaryColor, borderWidth: 2 }]}
                    onPress={() => {
                        setType(t.id);
                        setTitle(`${t.label} - ${new Date().toLocaleDateString()}`);
                        setStep(1);
                    }}
                >
                    <View style={styles.iconCircle}>
                        <FileText color={primaryColor} size={24} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.typeTitle, { color: textColor }]}>{t.label}</Text>
                        <Text style={[styles.typeDesc, { color: '#94a3b8' }]}>{t.description}</Text>
                    </View>
                    <ChevronRight color="#94a3b8" size={20} />
                </TouchableOpacity>
            ))}
        </View>
    );

    const renderBasicInfo = () => (
        <View>
            <Text style={[styles.stepTitle, { color: textColor }]}>Basic Information</Text>

            <View style={[styles.section, { backgroundColor: cardBg }]}>
                <Input
                    label="Contract Title"
                    value={title}
                    onChangeText={setTitle}
                    placeholder="e.g. Web Development Agreement"
                />

                <Text style={[styles.label, { color: textColor, marginTop: 16 }]}>Select Client</Text>
                <ScrollView style={{ maxHeight: 200, marginTop: 8 }}>
                    {clients.map(c => (
                        <TouchableOpacity
                            key={c.id}
                            style={[
                                styles.clientOption,
                                { backgroundColor: inputBg },
                                clientId === c.id && { borderColor: primaryColor, borderWidth: 1 }
                            ]}
                            onPress={() => setClientId(c.id)}
                        >
                            <User size={16} color={clientId === c.id ? primaryColor : '#94a3b8'} />
                            <Text style={{ color: textColor, marginLeft: 12 }}>{c.name}</Text>
                            {clientId === c.id && <Check size={16} color={primaryColor} style={{ marginLeft: 'auto' }} />}
                        </TouchableOpacity>
                    ))}
                    {clients.length === 0 && (
                        <Text style={{ color: '#94a3b8', padding: 8 }}>No clients found. Add one in the Clients tab first.</Text>
                    )}
                </ScrollView>
            </View>

            <Button
                title="Next: Contract Details"
                onPress={() => {
                    if (!clientId) { Alert.alert('Required', 'Please select a client'); return; }
                    setStep(2);
                }}
                style={{ marginTop: 24 }}
            />
        </View>
    );

    const renderQuestions = () => (
        <View>
            <Text style={[styles.stepTitle, { color: textColor }]}>Contract Details</Text>
            <Card style={{ backgroundColor: cardBg, padding: 16 }}>
                {type === 'service_agreement' ? (
                    <>
                        <Input
                            label="Scope of Services"
                            placeholder="Describe what services will be provided..."
                            value={answers.scope}
                            onChangeText={t => setAnswers({ ...answers, scope: t })}
                            multiline
                            numberOfLines={4}
                        />
                        <Input
                            label="Payment Terms"
                            placeholder="e.g. 50% upfront, 50% upon completion"
                            value={answers.paymentTerms}
                            onChangeText={t => setAnswers({ ...answers, paymentTerms: t })}
                        />
                        <Input
                            label="Timeline / Duration"
                            placeholder="e.g. 2 weeks, or starting from Jan 1st"
                            value={answers.timeline}
                            onChangeText={t => setAnswers({ ...answers, timeline: t })}
                        />
                    </>
                ) : (
                    <>
                        <Input
                            label="Confidential Information Description"
                            placeholder="What information is considered confidential?"
                            value={answers.confidentialInfo}
                            onChangeText={t => setAnswers({ ...answers, confidentialInfo: t })}
                            multiline
                        />
                        <Input
                            label="Duration of Confidentiality"
                            placeholder="e.g. 2 years, Indefinite"
                            value={answers.duration}
                            onChangeText={t => setAnswers({ ...answers, duration: t })}
                        />
                    </>
                )}
            </Card>

            <Button
                title="Next: Signatures"
                onPress={() => setStep(3)}
                style={{ marginTop: 24 }}
            />
        </View>
    );

    const renderSignatures = () => (
        <View>
            <Text style={[styles.stepTitle, { color: textColor }]}>Signatures</Text>
            <Text style={[styles.stepSubtitle, { color: mutedColor }]}>
                Both parties must sign to finalize the contract.
            </Text>

            <Card style={{ backgroundColor: cardBg, padding: 16 }}>
                {renderSignatureBox(
                    'Your Signature (Provider)',
                    signature,
                    () => openSignaturePad('user'),
                    () => setSignature(null)
                )}

                <View style={styles.divider} />

                {renderSignatureBox(
                    'Client Signature (Counterparty)',
                    counterpartySignature,
                    () => openSignaturePad('counterparty'),
                    () => setCounterpartySignature(null)
                )}
            </Card>

            <View style={styles.signatureStatus}>
                <View style={[styles.statusBadge, { backgroundColor: signature ? '#10b98120' : '#ef444420' }]}>
                    <Text style={{ color: signature ? '#10b981' : '#ef4444', fontSize: 12, fontWeight: '600' }}>
                        {signature ? '✓ Provider Signed' : '○ Awaiting Provider'}
                    </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: counterpartySignature ? '#10b98120' : '#ef444420' }]}>
                    <Text style={{ color: counterpartySignature ? '#10b981' : '#ef4444', fontSize: 12, fontWeight: '600' }}>
                        {counterpartySignature ? '✓ Client Signed' : '○ Awaiting Client'}
                    </Text>
                </View>
            </View>

            <Button
                title={signature && counterpartySignature ? 'Finalize Contract' : 'Save as Draft'}
                onPress={handleSave}
                loading={loading}
                style={{ marginTop: 24 }}
            />
        </View>
    );

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.container, { backgroundColor: bgColor }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => step > 0 ? setStep(step - 1) : navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft color={textColor} size={24} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: textColor }]}>
                    {step === 0 ? 'New Contract' : step === 1 ? 'Setup' : step === 2 ? 'Details' : 'Sign'}
                </Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {step === 0 && renderTypeSelection()}
                {step === 1 && renderBasicInfo()}
                {step === 2 && renderQuestions()}
                {step === 3 && renderSignatures()}
            </ScrollView>

            <SignaturePadModal
                visible={showSignaturePad}
                onClose={() => setShowSignaturePad(false)}
                onSave={handleSignatureSave}
                primaryColor={primaryColor}
            />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16 },
    backButton: {},
    title: { fontSize: 20, fontWeight: 'bold' },
    content: { padding: 16 },
    stepTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
    stepSubtitle: { fontSize: 14, marginBottom: 24 },
    typeCard: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 16, marginBottom: 16, gap: 16 },
    iconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(99, 102, 241, 0.1)', alignItems: 'center', justifyContent: 'center' },
    typeTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
    typeDesc: { fontSize: 14 },
    section: { borderRadius: 16, padding: 16 },
    label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
    clientOption: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, marginBottom: 8 },
    divider: { height: 1, backgroundColor: '#334155', marginVertical: 20, opacity: 0.2 },
    signatureBox: { marginBottom: 16 },
    signatureLabel: { fontSize: 14, fontWeight: '600', marginBottom: 12 },
    signaturePreview: { height: 120, borderRadius: 12, overflow: 'hidden', position: 'relative' },
    signatureImage: { width: '100%', height: '100%' },
    clearSignature: { position: 'absolute', top: 8, right: 8, backgroundColor: '#ef4444', borderRadius: 12, padding: 4 },
    signaturePlaceholder: { height: 120, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
    signatureStatus: { flexDirection: 'row', gap: 12, marginTop: 16 },
    statusBadge: { flex: 1, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, alignItems: 'center' },
});
