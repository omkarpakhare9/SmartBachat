import 'dart:math' as math;
import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

/// Soft full-screen gradient backdrop with floating money symbols.
class MoneyBackground extends StatelessWidget {
  const MoneyBackground({super.key, required this.child, this.showCoins = true});

  final Widget child;
  final bool showCoins;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(gradient: AppColors.screenGradient),
      child: Stack(
        children: [
          if (showCoins)
            Positioned(
              top: -40,
              right: -30,
              child: Opacity(
                opacity: 0.18,
                child: CustomPaint(
                  size: const Size(220, 220),
                  painter: _CoinPainter(),
                ),
              ),
            ),
          if (showCoins)
            Positioned(
              bottom: -50,
              left: -40,
              child: Opacity(
                opacity: 0.14,
                child: CustomPaint(
                  size: const Size(260, 260),
                  painter: _CoinPainter(),
                ),
              ),
            ),
          if (showCoins)
            const Positioned(
              top: 120,
              left: 24,
              child: Text(
                '₹',
                style: TextStyle(
                  fontSize: 80,
                  color: Color(0x1410B981),
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
          if (showCoins)
            const Positioned(
              bottom: 140,
              right: 30,
              child: Text(
                '\$',
                style: TextStyle(
                  fontSize: 90,
                  color: Color(0x14FBBF24),
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
          child,
        ],
      ),
    );
  }
}

/// Stylized rupee coin – two coins stacked with shine.
class CoinIllustration extends StatelessWidget {
  const CoinIllustration({super.key, this.size = 140, this.symbol = '₹'});

  final double size;
  final String symbol;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        alignment: Alignment.center,
        children: [
          Positioned(
            bottom: 0,
            child: _CoinDisc(diameter: size * 0.78, symbol: ''),
          ),
          Positioned(
            top: 0,
            child: _CoinDisc(diameter: size * 0.78, symbol: symbol),
          ),
          Positioned(
            top: size * 0.16,
            left: size * 0.18,
            child: Container(
              width: size * 0.18,
              height: size * 0.08,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.6),
                borderRadius: BorderRadius.circular(20),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _CoinDisc extends StatelessWidget {
  const _CoinDisc({required this.diameter, required this.symbol});

  final double diameter;
  final String symbol;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: diameter,
      height: diameter,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: const RadialGradient(
          center: Alignment(-0.3, -0.3),
          radius: 0.9,
          colors: [Color(0xFFFFE082), Color(0xFFFBBF24), Color(0xFFB45309)],
        ),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFFB45309).withOpacity(0.45),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
        border: Border.all(color: const Color(0xFFD97706), width: 3),
      ),
      child: Center(
        child: Text(
          symbol,
          style: TextStyle(
            fontSize: diameter * 0.45,
            fontWeight: FontWeight.w900,
            color: const Color(0xFF7C2D12),
          ),
        ),
      ),
    );
  }
}

class _CoinPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..shader = const LinearGradient(
        colors: [Color(0xFFFBBF24), Color(0xFFB45309)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ).createShader(Rect.fromLTWH(0, 0, size.width, size.height));
    final outline = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 6
      ..color = const Color(0xFFD97706);
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.shortestSide / 2;
    canvas.drawCircle(center, radius, paint);
    canvas.drawCircle(center, radius, outline);
    canvas.drawCircle(center, radius - 14, outline);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Money-themed wallet/credit-card style hero card.
class WalletCard extends StatelessWidget {
  const WalletCard({
    super.key,
    required this.balance,
    required this.currencySymbol,
    this.ownerName,
    this.income = '0.00',
    this.expense = '0.00',
  });

  final String balance;
  final String currencySymbol;
  final String? ownerName;
  final String income;
  final String expense;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(22, 22, 22, 22),
      decoration: BoxDecoration(
        gradient: AppColors.walletGradient,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: AppColors.primaryDark.withOpacity(0.35),
            blurRadius: 22,
            offset: const Offset(0, 12),
          ),
        ],
      ),
      child: Stack(
        children: [
          Positioned(
            right: -30,
            top: -30,
            child: Container(
              width: 140,
              height: 140,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withOpacity(0.08),
              ),
            ),
          ),
          Positioned(
            right: 20,
            bottom: 10,
            child: Text(
              currencySymbol,
              style: TextStyle(
                fontSize: 90,
                fontWeight: FontWeight.w900,
                color: Colors.white.withOpacity(0.07),
              ),
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 38,
                        height: 28,
                        decoration: BoxDecoration(
                          gradient: AppColors.goldGradient,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Icon(Icons.memory,
                            size: 16, color: Color(0xFF7C2D12)),
                      ),
                      const SizedBox(width: 12),
                      const Icon(Icons.wifi,
                          color: Colors.white70, size: 22),
                    ],
                  ),
                  const Text(
                    'SmartBachat',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 1.2,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 22),
              const Text(
                'Total Balance',
                style: TextStyle(color: Colors.white70, fontSize: 13),
              ),
              const SizedBox(height: 6),
              Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    currencySymbol,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 24,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    balance,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 34,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 0.5,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              Row(
                children: [
                  _PillStat(
                    icon: Icons.arrow_downward,
                    label: 'Income',
                    value: '$currencySymbol $income',
                  ),
                  const SizedBox(width: 12),
                  _PillStat(
                    icon: Icons.arrow_upward,
                    label: 'Spent',
                    value: '$currencySymbol $expense',
                  ),
                ],
              ),
              const SizedBox(height: 18),
              Text(
                (ownerName ?? 'YOUR NAME').toUpperCase(),
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 2,
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _PillStat extends StatelessWidget {
  const _PillStat({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.14),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.white.withOpacity(0.18)),
        ),
        child: Row(
          children: [
            Icon(icon, color: Colors.white, size: 18),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label,
                      style: const TextStyle(
                          color: Colors.white70, fontSize: 11)),
                  Text(value,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w800,
                        fontSize: 14,
                      )),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Reusable gradient app bar with optional money emoji.
class GradientAppBar extends StatelessWidget implements PreferredSizeWidget {
  const GradientAppBar({
    super.key,
    required this.title,
    this.actions,
    this.leading,
    this.gradient,
  });

  final String title;
  final List<Widget>? actions;
  final Widget? leading;
  final Gradient? gradient;

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        gradient: gradient ?? AppColors.primaryGradient,
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withOpacity(0.25),
            blurRadius: 14,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: AppBar(
        title: Text(title),
        actions: actions,
        leading: leading,
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
    );
  }
}

/// Decorative summary card with gradient, icon and large amount.
class GradientStatCard extends StatelessWidget {
  const GradientStatCard({
    super.key,
    required this.title,
    required this.amount,
    required this.icon,
    required this.gradient,
    this.subtitle,
  });

  final String title;
  final String amount;
  final IconData icon;
  final Gradient gradient;
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: gradient,
        borderRadius: BorderRadius.circular(18),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.08),
            blurRadius: 14,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.25),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: Colors.white, size: 22),
          ),
          const SizedBox(height: 12),
          Text(title,
              style: const TextStyle(
                color: Colors.white70,
                fontSize: 13,
                fontWeight: FontWeight.w600,
              )),
          const SizedBox(height: 4),
          Text(amount,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 20,
                fontWeight: FontWeight.w900,
              )),
          if (subtitle != null) ...[
            const SizedBox(height: 4),
            Text(subtitle!,
                style: const TextStyle(
                    color: Colors.white70, fontSize: 11)),
          ],
        ],
      ),
    );
  }
}

/// Colorful quick action tile with money/category accent.
class QuickActionTile extends StatelessWidget {
  const QuickActionTile({
    super.key,
    required this.title,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  final String title;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          boxShadow: [
            BoxShadow(
              color: color.withOpacity(0.12),
              blurRadius: 14,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [color.withOpacity(0.85), color],
                ),
                borderRadius: BorderRadius.circular(14),
                boxShadow: [
                  BoxShadow(
                    color: color.withOpacity(0.3),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Icon(icon, color: Colors.white, size: 26),
            ),
            const SizedBox(height: 16),
            Text(
              title,
              style: const TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 14,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 4),
            Row(
              children: [
                Text(
                  'Open',
                  style: TextStyle(
                    color: color,
                    fontWeight: FontWeight.w700,
                    fontSize: 12,
                  ),
                ),
                Icon(Icons.arrow_forward, color: color, size: 14),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// Cash-bill shaped illustration for empty-state and auth screens.
class CashBillIllustration extends StatelessWidget {
  const CashBillIllustration({super.key, this.size = 180});

  final double size;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(painter: _CashBillPainter()),
    );
  }
}

class _CashBillPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final billRect = Rect.fromCenter(
      center: Offset(size.width / 2, size.height / 2),
      width: size.width * 0.9,
      height: size.height * 0.55,
    );

    canvas.save();
    canvas.translate(size.width / 2, size.height / 2);
    canvas.rotate(-math.pi / 14);
    canvas.translate(-size.width / 2, -size.height / 2);

    final shadow = Paint()
      ..color = Colors.black.withOpacity(0.18)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 14);
    canvas.drawRRect(
      RRect.fromRectAndRadius(billRect.shift(const Offset(0, 8)),
          const Radius.circular(16)),
      shadow,
    );

    final paint = Paint()
      ..shader = const LinearGradient(
        colors: [Color(0xFF34D399), Color(0xFF059669), Color(0xFF047857)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ).createShader(billRect);
    canvas.drawRRect(
      RRect.fromRectAndRadius(billRect, const Radius.circular(16)),
      paint,
    );

    final border = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2
      ..color = Colors.white.withOpacity(0.55);
    canvas.drawRRect(
      RRect.fromRectAndRadius(billRect.deflate(8), const Radius.circular(12)),
      border,
    );

    final circlePaint = Paint()
      ..color = Colors.white.withOpacity(0.18);
    canvas.drawCircle(billRect.centerLeft + const Offset(36, 0), 22, circlePaint);
    canvas.drawCircle(billRect.centerRight - const Offset(36, 0), 22, circlePaint);

    final textPainter = TextPainter(
      text: const TextSpan(
        text: '₹',
        style: TextStyle(
          color: Colors.white,
          fontSize: 48,
          fontWeight: FontWeight.w900,
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    textPainter.paint(
      canvas,
      Offset(
        billRect.center.dx - textPainter.width / 2,
        billRect.center.dy - textPainter.height / 2,
      ),
    );

    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
