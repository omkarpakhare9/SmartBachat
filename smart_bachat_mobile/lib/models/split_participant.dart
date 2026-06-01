class SplitParticipant {
  final String id;
  final String? userId;
  final String? email;
  final double share;
  final bool paid;

  SplitParticipant({
    required this.id,
    this.userId,
    this.email,
    required this.share,
    required this.paid,
  });

  factory SplitParticipant.fromJson(Map<String, dynamic> json) {
    return SplitParticipant(
      id: json['_id'] ?? json['id'] ?? '',
      userId: json['user']?['_id'] ?? json['userId'],
      email: json['email'],
      share: json['share'] != null
          ? (json['share'] is num ? (json['share'] as num).toDouble() : double.parse(json['share'].toString()))
          : 0,
      paid: json['paid'] == true || json['paid'] == 1,
    );
  }
}
