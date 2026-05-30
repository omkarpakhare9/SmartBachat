class Budget {
  final String id;
  final String categoryId;
  final String? categoryName;
  final double amount;
  final String period; // 'monthly', 'weekly', etc.
  final int year;
  final int month;
  final double? spent;
  final double? remaining;

  Budget({
    required this.id,
    required this.categoryId,
    this.categoryName,
    required this.amount,
    required this.period,
    required this.year,
    required this.month,
    this.spent,
    this.remaining,
  });

  factory Budget.fromJson(Map<String, dynamic> json) {
    return Budget(
      id: json['_id'] ?? json['id'],
      categoryId: json['category']?['_id'] ?? json['categoryId'] ?? '',
      categoryName: json['category']?['name'] ?? json['categoryName'],
      amount: (json['amount'] is num) ? (json['amount'] as num).toDouble() : double.parse(json['amount'].toString()),
      period: json['period'],
      year: json['year'],
      month: json['month'],
      spent: json['spent'] != null 
          ? (json['spent'] is num) 
              ? (json['spent'] as num).toDouble() 
              : double.parse(json['spent'].toString())
          : null,
      remaining: json['remaining'] != null 
          ? (json['remaining'] is num) 
              ? (json['remaining'] as num).toDouble() 
              : double.parse(json['remaining'].toString())
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'category': categoryId,
      'amount': amount,
      'period': period,
      'year': year,
      'month': month,
    };
  }
}
