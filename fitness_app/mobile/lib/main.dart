import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'screens/daily_workout_screen.dart';
import 'services/api_client.dart';
import 'state/workout_state.dart';

void main() {
  const baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:8000',
  );
  const userId = int.fromEnvironment('USER_ID', defaultValue: 1);

  runApp(FitnessApp(baseUrl: baseUrl, userId: userId));
}

class FitnessApp extends StatelessWidget {
  const FitnessApp({super.key, required this.baseUrl, required this.userId});

  final String baseUrl;
  final int userId;

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => WorkoutState(
        api: ApiClient(baseUrl: baseUrl),
        userId: userId,
      ),
      child: MaterialApp(
        title: 'Fitness Tracker',
        theme: ThemeData(
          colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepOrange),
          useMaterial3: true,
        ),
        home: const DailyWorkoutScreen(),
      ),
    );
  }
}
