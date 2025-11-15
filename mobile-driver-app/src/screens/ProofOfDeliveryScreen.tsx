import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
} from 'react-native';
import SignatureCanvas from 'react-native-signature-canvas';
import { launchCamera } from 'react-native-image-picker';
import { ordersService } from '@/services/orders.service';
import { useRunsStore } from '@/store/runs.store';
import { ProofOfDelivery } from '@/types';

interface ProofOfDeliveryScreenProps {
  navigation: any;
  route: any;
}

const ProofOfDeliveryScreen: React.FC<ProofOfDeliveryScreenProps> = ({
  navigation,
  route,
}) => {
  const { orderId, orderIndex } = route.params;
  const { currentRun, moveToNextOrder, refreshCurrentRun } = useRunsStore();

  const [recipientName, setRecipientName] = useState('');
  const [notes, setNotes] = useState('');
  const [signature, setSignature] = useState<string | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [showFailureModal, setShowFailureModal] = useState(false);
  const [failureReason, setFailureReason] = useState('');

  const signatureRef = useRef<any>(null);
  const order = currentRun?.orders[orderIndex];

  const handleSignature = (signatureData: string) => {
    setSignature(signatureData);
    setShowSignaturePad(false);
  };

  const clearSignature = () => {
    setSignature(null);
    if (signatureRef.current) {
      signatureRef.current.clearSignature();
    }
  };

  const takePhoto = async () => {
    try {
      const result = await launchCamera({
        mediaType: 'photo',
        quality: 0.8,
        saveToPhotos: false,
      });

      if (result.assets && result.assets[0].uri) {
        setPhotos([...photos, result.assets[0].uri]);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleDelivered = async () => {
    if (!signature && !recipientName) {
      Alert.alert('Required', 'Please capture a signature or enter recipient name');
      return;
    }

    setIsSubmitting(true);

    try {
      const proofOfDelivery: ProofOfDelivery = {
        signature: signature || undefined,
        photos: photos.length > 0 ? photos : undefined,
        notes: notes || undefined,
        recipientName: recipientName || undefined,
        timestamp: new Date().toISOString(),
      };

      // Upload photos first
      if (photos.length > 0) {
        const photoUrls = await ordersService.uploadPhotos(orderId, photos);
        proofOfDelivery.photos = photoUrls;
      }

      // Upload signature
      if (signature) {
        const signatureUrl = await ordersService.uploadSignature(orderId, signature);
        proofOfDelivery.signature = signatureUrl;
      }

      // Mark as delivered
      await ordersService.deliverOrder(orderId, proofOfDelivery);

      // Refresh run data
      await refreshCurrentRun();

      Alert.alert('Success', 'Delivery completed successfully!', [
        {
          text: 'OK',
          onPress: () => {
            if (currentRun && orderIndex < currentRun.orders.length - 1) {
              moveToNextOrder();
              navigation.goBack();
            } else {
              // Last delivery
              navigation.navigate('RunDetails', { runId: currentRun?.id });
            }
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to complete delivery');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFailed = () => {
    setFailureReason('');
    setShowFailureModal(true);
  };

  const submitFailure = async () => {
    setShowFailureModal(true);
  };

  const confirmFailedDelivery = async () => {
    if (!failureReason.trim()) {
      Alert.alert('Required', 'Please provide a reason for failure');
      return;
    }

    setShowFailureModal(false);
    setIsSubmitting(true);

    try {
      await ordersService.failOrder(orderId, failureReason);
      await refreshCurrentRun();

      setFailureReason(''); // Clear for next time

      Alert.alert('Marked as Failed', 'Order has been marked as failed', [
        {
          text: 'OK',
          onPress: () => {
            if (currentRun && orderIndex < currentRun.orders.length - 1) {
              moveToNextOrder();
              navigation.goBack();
            } else {
              navigation.navigate('RunDetails', { runId: currentRun?.id });
            }
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update order');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!order) {
    return (
      <View style={styles.container}>
        <Text>Order not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Proof of Delivery</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.content}>
        {/* Order Info */}
        <View style={styles.orderInfo}>
          <Text style={styles.customerName}>
            {order.customer.firstName} {order.customer.lastName}
          </Text>
          <Text style={styles.orderNumber}>Order #{order.orderNumber}</Text>
          <Text style={styles.address}>
            {order.address.line1}, {order.address.city}
          </Text>
        </View>

        {/* Recipient Name */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recipient Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Who received this delivery?"
            value={recipientName}
            onChangeText={setRecipientName}
            editable={!isSubmitting}
          />
        </View>

        {/* Signature */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Signature</Text>
          {signature ? (
            <View style={styles.signaturePreview}>
              <Image
                source={{ uri: signature }}
                style={styles.signatureImage}
                resizeMode="contain"
              />
              <TouchableOpacity
                style={styles.clearButton}
                onPress={clearSignature}>
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.signatureButton}
              onPress={() => setShowSignaturePad(true)}>
              <Text style={styles.signatureButtonText}>✍️ Capture Signature</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Photos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photos (Optional)</Text>
          <View style={styles.photosContainer}>
            {photos.map((photo, index) => (
              <View key={index} style={styles.photoWrapper}>
                <Image source={{ uri: photo }} style={styles.photo} />
                <TouchableOpacity
                  style={styles.removePhotoButton}
                  onPress={() => removePhoto(index)}>
                  <Text style={styles.removePhotoText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={styles.addPhotoButton} onPress={takePhoto}>
              <Text style={styles.addPhotoText}>📷</Text>
              <Text style={styles.addPhotoLabel}>Add Photo</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes (Optional)</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            placeholder="Add any notes about this delivery..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            editable={!isSubmitting}
          />
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.failButton]}
          onPress={handleFailed}
          disabled={isSubmitting}>
          <Text style={styles.actionButtonText}>❌ Failed</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deliveredButton]}
          onPress={handleDelivered}
          disabled={isSubmitting}>
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.actionButtonText}>✓ Delivered</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Failure Reason Modal */}
      <Modal
        visible={showFailureModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFailureModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.failureModalContent}>
            <Text style={styles.failureModalTitle}>Delivery Failed</Text>
            <Text style={styles.failureModalSubtitle}>
              Please provide a reason for the failure:
            </Text>
            <TextInput
              style={[styles.input, styles.failureReasonInput]}
              placeholder="Reason for failure..."
              value={failureReason}
              onChangeText={setFailureReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              autoFocus
            />
            <View style={styles.failureModalButtons}>
              <TouchableOpacity
                style={[styles.failureModalButton, styles.cancelButton]}
                onPress={() => {
                  setShowFailureModal(false);
                  setFailureReason('');
                }}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.failureModalButton, styles.confirmFailButton]}
                onPress={confirmFailedDelivery}>
                <Text style={styles.confirmFailButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Signature Modal */}
      {showSignaturePad && (
        <View style={styles.signatureModal}>
          <View style={styles.signatureModalHeader}>
            <TouchableOpacity onPress={() => setShowSignaturePad(false)}>
              <Text style={styles.modalCloseButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Sign Here</Text>
            <TouchableOpacity onPress={() => signatureRef.current?.clearSignature()}>
              <Text style={styles.modalClearButton}>Clear</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.signatureCanvasContainer}>
            <SignatureCanvas
              ref={signatureRef}
              onOK={handleSignature}
              descriptionText="Sign above"
              clearText="Clear"
              confirmText="Save"
              webStyle={`
                .m-signature-pad {
                  box-shadow: none;
                  border: none;
                }
                .m-signature-pad--body {
                  border: 2px dashed #e0e0e0;
                  border-radius: 8px;
                }
                .m-signature-pad--footer {
                  display: none;
                }
              `}
            />
          </View>
          <TouchableOpacity
            style={styles.saveSignatureButton}
            onPress={() => signatureRef.current?.readSignature()}>
            <Text style={styles.saveSignatureButtonText}>Save Signature</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Failure Reason Modal */}
      <Modal
        visible={showFailureModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFailureModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.failureModalContainer}>
            <Text style={styles.failureModalTitle}>Delivery Failed</Text>
            <Text style={styles.failureModalSubtitle}>Please provide a reason:</Text>
            <TextInput
              style={styles.failureInput}
              placeholder="e.g., Customer not home, Wrong address..."
              value={failureReason}
              onChangeText={setFailureReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              autoFocus
            />
            <View style={styles.failureModalButtons}>
              <TouchableOpacity
                style={[styles.failureModalButton, styles.cancelButton]}
                onPress={() => setShowFailureModal(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.failureModalButton, styles.submitButton]}
                onPress={submitFailure}>
                <Text style={styles.submitButtonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2196F3',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    fontSize: 28,
    color: '#fff',
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  orderInfo: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  customerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  orderNumber: {
    fontSize: 14,
    color: '#2196F3',
    marginBottom: 8,
  },
  address: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  notesInput: {
    height: 100,
  },
  signatureButton: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  signatureButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  signaturePreview: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 8,
  },
  signatureImage: {
    width: '100%',
    height: 150,
  },
  clearButton: {
    marginTop: 8,
    padding: 8,
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#f44336',
    fontSize: 14,
  },
  photosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoWrapper: {
    position: 'relative',
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#f44336',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removePhotoText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addPhotoButton: {
    width: 100,
    height: 100,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoText: {
    fontSize: 32,
    marginBottom: 4,
  },
  addPhotoLabel: {
    fontSize: 12,
    color: '#666',
  },
  footer: {
    backgroundColor: '#fff',
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  actionButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  failButton: {
    backgroundColor: '#f44336',
  },
  deliveredButton: {
    backgroundColor: '#4CAF50',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  signatureModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
  },
  signatureModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalCloseButton: {
    fontSize: 16,
    color: '#666',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalClearButton: {
    fontSize: 16,
    color: '#2196F3',
  },
  signatureCanvasContainer: {
    flex: 1,
    margin: 16,
  },
  saveSignatureButton: {
    backgroundColor: '#2196F3',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveSignatureButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  failureModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '85%',
  },
  failureModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  failureModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  failureModalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  failureInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minHeight: 100,
    marginBottom: 20,
  },
  failureReasonInput: {
    height: 100,
    marginBottom: 16,
  },
  failureModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  failureModalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#f44336',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmFailButton: {
    backgroundColor: '#f44336',
  },
  confirmFailButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProofOfDeliveryScreen;
