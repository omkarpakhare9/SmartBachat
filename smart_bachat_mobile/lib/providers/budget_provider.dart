import 'dart:convert';

import 'package:flutter/foundation.dart';
import '../models/budget.dart';
import '../services/api_service.dart';

class BudgetProvider extends ChangeNotifier {
  final ApiService _apiService = ApiService();

  List<Budget> _budgets = [];
  bool _isLoading = false;
  bool _isSubmitting = false;
  String? _error;

  List<Budget> get budgets => _budgets;
  bool get isLoading => _isLoading;
  bool get isSubmitting => _isSubmitting;
  String? get error => _error;

  Future<void> fetchBudgets({String? period}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final query = period != null ? '?period=$period' : '';
      final response = await _apiService.get('/budgets$query');
      if (response.statusCode == 200) {
        final jsonBody = jsonDecode(response.body);
        final data = jsonBody['data'] ?? [];
        _budgets = (data as List)
            .map((item) => Budget.fromJson(item as Map<String, dynamic>))
            .toList();
      } else {
        _error = 'Unable to load budgets';
      }
    } catch (e) {
      _error = 'Unable to load budgets: $e';
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<bool> addBudget({
    required String categoryId,
    required double amount,
    required String period,
    required int year,
    required int month,
  }) async {
    _isSubmitting = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _apiService.post('/budgets', body: {
        'category': categoryId,
        'amount': amount,
        'period': period,
        'year': year,
        'month': month,
      });

      if (response.statusCode == 201) {
        final jsonBody = jsonDecode(response.body);
        final budget = Budget.fromJson(jsonBody['data']);
        _budgets.insert(0, budget);
        _isSubmitting = false;
        notifyListeners();
        return true;
      }

      _error = 'Failed to create budget';
    } catch (e) {
      _error = 'Failed to create budget: $e';
    }

    _isSubmitting = false;
    notifyListeners();
    return false;
  }

  Future<bool> updateBudget({
    required String id,
    required String categoryId,
    required double amount,
    required String period,
    required int year,
    required int month,
  }) async {
    _isSubmitting = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _apiService.put('/budgets/$id', body: {
        'category': categoryId,
        'amount': amount,
        'period': period,
        'year': year,
        'month': month,
      });

      if (response.statusCode == 200) {
        final jsonBody = jsonDecode(response.body);
        final budget = Budget.fromJson(jsonBody['data']);
        _budgets = _budgets.map((item) => item.id == budget.id ? budget : item).toList();
        _isSubmitting = false;
        notifyListeners();
        return true;
      }

      _error = 'Failed to update budget';
    } catch (e) {
      _error = 'Failed to update budget: $e';
    }

    _isSubmitting = false;
    notifyListeners();
    return false;
  }

  Future<bool> deleteBudget(String id) async {
    _isSubmitting = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _apiService.delete('/budgets/$id');
      if (response.statusCode == 200) {
        _budgets.removeWhere((budget) => budget.id == id);
        _isSubmitting = false;
        notifyListeners();
        return true;
      }

      _error = 'Failed to delete budget';
    } catch (e) {
      _error = 'Failed to delete budget: $e';
    }

    _isSubmitting = false;
    notifyListeners();
    return false;
  }
}
