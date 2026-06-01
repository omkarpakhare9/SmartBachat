import 'dart:convert';

import 'package:flutter/foundation.dart';
import '../services/api_service.dart';

class ReportProvider extends ChangeNotifier {
  final ApiService _apiService = ApiService();

  bool _isLoading = false;
  String? _error;
  Map<String, dynamic> _summary = {};
  List<Map<String, dynamic>> _categoryBreakdown = [];
  List<Map<String, dynamic>> _monthlyTrends = [];

  bool get isLoading => _isLoading;
  String? get error => _error;
  Map<String, dynamic> get summary => _summary;
  List<Map<String, dynamic>> get categoryBreakdown => _categoryBreakdown;
  List<Map<String, dynamic>> get monthlyTrends => _monthlyTrends;

  Future<void> fetchSummary({String? startDate, String? endDate}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final query = <String>[];
      if (startDate != null) query.add('startDate=$startDate');
      if (endDate != null) query.add('endDate=$endDate');
      final suffix = query.isNotEmpty ? '?${query.join('&')}' : '';
      final response = await _apiService.get('/reports/summary$suffix');
      if (response.statusCode == 200) {
        final jsonBody = jsonDecode(response.body);
        _summary = Map<String, dynamic>.from(jsonBody['data'] ?? {});
      } else {
        _error = 'Unable to load report summary';
      }
    } catch (e) {
      _error = 'Unable to load report summary: $e';
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<void> fetchCategoryBreakdown({String? type, String? startDate, String? endDate}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final query = <String>[];
      if (type != null && type != 'all') query.add('type=$type');
      if (startDate != null) query.add('startDate=$startDate');
      if (endDate != null) query.add('endDate=$endDate');
      final suffix = query.isNotEmpty ? '?${query.join('&')}' : '';
      final response = await _apiService.get('/reports/by-category$suffix');
      if (response.statusCode == 200) {
        final jsonBody = jsonDecode(response.body);
        final data = jsonBody['data'] ?? [];
        _categoryBreakdown = (data as List)
            .map((item) => Map<String, dynamic>.from(item as Map<String, dynamic>))
            .toList();
      } else {
        _error = 'Unable to load category report';
      }
    } catch (e) {
      _error = 'Unable to load category report: $e';
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<void> fetchMonthlyTrends({int? year}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final suffix = year != null ? '?year=$year' : '';
      final response = await _apiService.get('/reports/monthly$suffix');
      if (response.statusCode == 200) {
        final jsonBody = jsonDecode(response.body);
        final data = jsonBody['data'] ?? [];
        _monthlyTrends = (data as List)
            .map((item) => Map<String, dynamic>.from(item as Map<String, dynamic>))
            .toList();
      } else {
        _error = 'Unable to load monthly trends';
      }
    } catch (e) {
      _error = 'Unable to load monthly trends: $e';
    }

    _isLoading = false;
    notifyListeners();
  }
}
