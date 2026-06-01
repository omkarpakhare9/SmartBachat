import 'dart:convert';

import 'package:flutter/foundation.dart';
import '../models/transaction.dart';
import '../services/api_service.dart';

class TransactionProvider extends ChangeNotifier {
  final ApiService _apiService = ApiService();

  List<Transaction> _transactions = [];
  bool _isLoading = false;
  bool _isSubmitting = false;
  String? _error;
  String _filter = 'all';

  List<Transaction> get transactions => _transactions;
  bool get isLoading => _isLoading;
  bool get isSubmitting => _isSubmitting;
  String? get error => _error;
  String get filter => _filter;

  Future<void> fetchTransactions({String? type}) async {
    _isLoading = true;
    _error = null;
    _filter = type ?? 'all';
    notifyListeners();

    try {
      final query = type != null && type != 'all' ? '?type=$type' : '';
      final response = await _apiService.get('/transactions$query');
      if (response.statusCode == 200) {
        final jsonBody = jsonDecode(response.body);
        final data = jsonBody['data'] ?? [];
        _transactions = (data as List)
            .map((item) => Transaction.fromJson(item as Map<String, dynamic>))
            .toList();
      } else {
        _error = 'Unable to load transactions';
      }
    } catch (e) {
      _error = 'Unable to load transactions: $e';
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<bool> addTransaction({
    required String type,
    required double amount,
    required String categoryId,
    required String description,
    required DateTime date,
    String? receiptPath,
  }) async {
    _isSubmitting = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _apiService.post('/transactions', body: {
        'type': type,
        'amount': amount,
        'category': categoryId,
        'description': description,
        'date': date.toIso8601String(),
      });

      if (response.statusCode == 201) {
        final jsonBody = jsonDecode(response.body);
        final transaction = Transaction.fromJson(jsonBody['data']);
        _transactions.insert(0, transaction);

        if (receiptPath != null && receiptPath.isNotEmpty) {
          await uploadReceipt(transaction.id, receiptPath);
        }

        _isSubmitting = false;
        notifyListeners();
        return true;
      }

      _error = 'Failed to create transaction';
    } catch (e) {
      _error = 'Failed to create transaction: $e';
    }

    _isSubmitting = false;
    notifyListeners();
    return false;
  }

  Future<bool> updateTransaction({
    required String id,
    required String type,
    required double amount,
    required String categoryId,
    required String description,
    required DateTime date,
    String? receiptPath,
  }) async {
    _isSubmitting = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _apiService.put('/transactions/$id', body: {
        'type': type,
        'amount': amount,
        'category': categoryId,
        'description': description,
        'date': date.toIso8601String(),
      });

      if (response.statusCode == 200) {
        final jsonBody = jsonDecode(response.body);
        final transaction = Transaction.fromJson(jsonBody['data']);
        _transactions = _transactions.map((existing) {
          return existing.id == transaction.id ? transaction : existing;
        }).toList();

        if (receiptPath != null && receiptPath.isNotEmpty) {
          await uploadReceipt(transaction.id, receiptPath);
        }

        _isSubmitting = false;
        notifyListeners();
        return true;
      }

      _error = 'Failed to update transaction';
    } catch (e) {
      _error = 'Failed to update transaction: $e';
    }

    _isSubmitting = false;
    notifyListeners();
    return false;
  }

  Future<bool> uploadReceipt(String transactionId, String filePath) async {
    try {
      final response = await _apiService.upload('/receipts/transaction/$transactionId/upload', filePath);
      return response.statusCode == 201;
    } catch (e) {
      _error = 'Receipt upload failed: $e';
      notifyListeners();
      return false;
    }
  }

  Future<bool> deleteTransaction(String id) async {
    _isSubmitting = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _apiService.delete('/transactions/$id');
      if (response.statusCode == 200) {
        _transactions.removeWhere((transaction) => transaction.id == id);
        _isSubmitting = false;
        notifyListeners();
        return true;
      }
      _error = 'Failed to delete transaction';
    } catch (e) {
      _error = 'Failed to delete transaction: $e';
    }

    _isSubmitting = false;
    notifyListeners();
    return false;
  }
}
