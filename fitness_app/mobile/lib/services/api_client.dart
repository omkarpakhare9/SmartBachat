import 'dart:convert';
import 'package:http/http.dart' as http;

import '../models/workout_day.dart';

class ApiClient {
  ApiClient({required this.baseUrl, http.Client? client})
      : _http = client ?? http.Client();

  final String baseUrl;
  final http.Client _http;

  Future<WorkoutDay> fetchToday(int userId) async {
    final res = await _http.get(Uri.parse('$baseUrl/users/$userId/workouts/today'));
    _ensureOk(res);
    return WorkoutDay.fromJson(jsonDecode(res.body) as Map<String, dynamic>);
  }

  Future<WorkoutDay> check({
    required int userId,
    required String exercise,
    required bool done,
  }) async {
    final res = await _http.post(
      Uri.parse('$baseUrl/users/$userId/workouts/today/check'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'exercise': exercise, 'done': done}),
    );
    _ensureOk(res);
    return WorkoutDay.fromJson(jsonDecode(res.body) as Map<String, dynamic>);
  }

  void _ensureOk(http.Response res) {
    if (res.statusCode >= 400) {
      throw Exception('API ${res.statusCode}: ${res.body}');
    }
  }
}
