import 'dart:convert';

import 'package:flutter/foundation.dart' show ChangeNotifier;
import '../models/category.dart';
import '../services/api_service.dart';

class CategoryProvider extends ChangeNotifier {
  final ApiService _apiService = ApiService();

  List<Category> _categories = [];
  bool _isLoading = false;
  String? _error;

  List<Category> get categories => _categories;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> fetchCategories({String? type}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final endpoint = type != null ? '/categories?type=$type' : '/categories';
      final response = await _apiService.get(endpoint);
      if (response.statusCode == 200) {
        final jsonBody = jsonDecode(response.body);
        final data = jsonBody['data'] ?? jsonBody;
        _categories = (data as List)
            .map((item) => Category.fromJson(item as Map<String, dynamic>))
            .toList();
      } else {
        _error = 'Unable to load categories';
      }
    } catch (e) {
      _error = 'Unable to load categories: $e';
    }

    _isLoading = false;
    notifyListeners();
  }
}
