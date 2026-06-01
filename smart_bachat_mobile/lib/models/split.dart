import 'split_participant.dart';

class Split {
  final String id;
  final String transactionId;
  final double totalAmount;
  final String splitType;
  final String? notes;
  final List<SplitParticipant> participants;

  Split({
    required this.id,
    required this.transactionId,
    required this.totalAmount,
    required this.splitType,
    this.notes,
    required this.participants,
  });

  factory Split.fromJson(Map<String, dynamic> json) {
    final participantsJson = json['participants'] as List<dynamic>? ?? [];
    return Split(
      id: json['_id'] ?? json['id'] ?? '',
      transactionId: json['transaction']?['_id'] ?? json['transactionId'] ?? '',
      totalAmount: json['totalAmount'] != null
          ? (json['totalAmount'] is num ? (json['totalAmount'] as num).toDouble() : double.parse(json['totalAmount'].toString()))
          : 0,
      splitType: json['splitType'] ?? json['split_type'] ?? 'equal',
      notes: json['notes'],
      participants: participantsJson
          .map((item) => SplitParticipant.fromJson(item as Map<String, dynamic>))
          .toList(),
    );
  }
}
