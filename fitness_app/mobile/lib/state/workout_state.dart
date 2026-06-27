import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/workout_day.dart';
import '../services/api_client.dart';

class WorkoutState extends ChangeNotifier {
  WorkoutState({required this.api, required this.userId});

  final ApiClient api;
  final int userId;

  WorkoutDay? _today;
  bool _loading = false;
  String? _error;

  WorkoutDay? get today => _today;
  bool get loading => _loading;
  String? get error => _error;

  static const _kCurrentDayKey = 'current_day';
  static const _kLastCompletedKey = 'last_completed';

  Future<void> load() async {
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      _today = await api.fetchToday(userId);
      await _persistFromToday();
    } catch (e) {
      _error = e.toString();
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> toggle(String exercise, bool done) async {
    if (_today == null) return;
    try {
      _today = await api.check(userId: userId, exercise: exercise, done: done);
      await _persistFromToday();
      _error = null;
    } catch (e) {
      _error = e.toString();
    }
    notifyListeners();
  }

  Future<void> _persistFromToday() async {
    final day = _today;
    if (day == null) return;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_kCurrentDayKey, day.dayNumber);
    if (day.completed) {
      await prefs.setString(
        _kLastCompletedKey,
        DateTime.now().toIso8601String().substring(0, 10),
      );
    }
  }
}
