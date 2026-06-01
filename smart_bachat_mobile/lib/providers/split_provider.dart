import 'dart:convert';

import 'package:flutter/foundation.dart';
import '../models/split.dart';
import '../services/api_service.dart';

class SplitProvider extends ChangeNotifier {
  final ApiService _apiService = ApiService();

  List<Split> _splits = [];
  bool _isLoading = false;
  bool _isSubmitting = false;
  String? _error;

  List<Split> get splits => _splits;
  bool get isLoading => _isLoading;
  bool get isSubmitting => _isSubmitting;
  String? get error => _error;

  Future<void> fetchSplits() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _apiService.get('/splits');
      if (response.statusCode == 200) {
        final jsonBody = jsonDecode(response.body);
        final data = jsonBody['data'] ?? [];
        _splits = (data as List)
            .map((item) => Split.fromJson(item as Map<String, dynamic>))
            .toList();
      } else {
        _error = 'Unable to load split expenses';
      }
    } catch (e) {
      _error = 'Unable to load split expenses: $e';
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<bool> createSplit({
    required String transactionId,
    required String splitType,
    required String notes,
    required List<Map<String, dynamic>> participants,
  }) async {
    _isSubmitting = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _apiService.post('/splits', body: {
        'transaction': transactionId,
        'splitType': splitType,
        'notes': notes,
        'participants': participants,
      });

      if (response.statusCode == 201) {
        final jsonBody = jsonDecode(response.body);
        final split = Split.fromJson(jsonBody['data']);
        _splits.insert(0, split);
        _isSubmitting = false;
        notifyListeners();
        return true;
      }
      _error = 'Unable to create split';
    } catch (e) {
      _error = 'Unable to create split: $e';
    }

    _isSubmitting = false;
    notifyListeners();
    return false;
  }
}
