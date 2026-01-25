# =============================================================================
# SHARED ANALYSIS FUNCTIONS
# =============================================================================
#
# Description:
#   Common analysis functions used across all three experiments testing
#   Festinger's Cognitive Dissonance Theory vs. Capaldi's Sequential Theory
#
# Experiments:
#   1. Digital Treasure Hunt (behavioral persistence)
#   2. Career Choice Study (within-subjects survey)
#   3. Pattern Memory Challenge (expectation and betting)
#
# Author: Research Games Project
# Date: January 2025
# =============================================================================

# =============================================================================
# SETUP
# =============================================================================

# Required packages
required_packages <- c(
  "tidyverse",    # Data manipulation
  "afex",         # ANOVA
  "emmeans",      # Estimated marginal means
  "effsize",      # Effect sizes
  "TOSTER",       # Equivalence testing
  "BayesFactor",  # Bayesian analysis
  "lavaan",       # SEM / Mediation
  "pwr",          # Power analysis
  "ggplot2",      # Visualization
  "patchwork",    # Combining plots
  "jsonlite"      # JSON parsing
)

#' Install and load required packages
#'
#' @param packages Vector of package names
load_packages <- function(packages = required_packages) {

  # Install missing packages
  missing <- packages[!packages %in% installed.packages()[, "Package"]]
  if (length(missing) > 0) {
    cat("Installing missing packages:", paste(missing, collapse = ", "), "\n")
    install.packages(missing)
  }

  # Load all packages
  for (pkg in packages) {
    suppressPackageStartupMessages(library(pkg, character.only = TRUE))
  }

  cat("Loaded", length(packages), "packages.\n")
}

# =============================================================================
# EFFECT SIZE FUNCTIONS
# =============================================================================

#' Calculate Cohen's d with confidence intervals
#'
#' @param group1 Numeric vector for group 1
#' @param group2 Numeric vector for group 2
#' @param conf.level Confidence level (default 0.95)
#' @return List with d, CI, and interpretation
cohens_d_ci <- function(group1, group2, conf.level = 0.95) {

  n1 <- length(group1)
  n2 <- length(group2)
  m1 <- mean(group1, na.rm = TRUE)
  m2 <- mean(group2, na.rm = TRUE)
  sd1 <- sd(group1, na.rm = TRUE)
  sd2 <- sd(group2, na.rm = TRUE)

  # Pooled SD
  pooled_sd <- sqrt(((n1 - 1) * sd1^2 + (n2 - 1) * sd2^2) / (n1 + n2 - 2))

  # Cohen's d
  d <- (m1 - m2) / pooled_sd

  # SE of d
  se_d <- sqrt((n1 + n2) / (n1 * n2) + d^2 / (2 * (n1 + n2)))

  # CI
  crit <- qnorm(1 - (1 - conf.level) / 2)
  ci_lower <- d - crit * se_d
  ci_upper <- d + crit * se_d

  # Interpretation
  abs_d <- abs(d)
  interpretation <- case_when(
    abs_d < 0.2 ~ "negligible",
    abs_d < 0.5 ~ "small",
    abs_d < 0.8 ~ "medium",
    TRUE ~ "large"
  )

  return(list(
    d = d,
    se = se_d,
    ci_lower = ci_lower,
    ci_upper = ci_upper,
    interpretation = interpretation,
    n1 = n1,
    n2 = n2
  ))
}

#' Calculate partial eta-squared from ANOVA
#'
#' @param ss_effect Sum of squares for effect
#' @param ss_error Sum of squares for error
#' @return Partial eta-squared
partial_eta_squared <- function(ss_effect, ss_error) {
  return(ss_effect / (ss_effect + ss_error))
}

# =============================================================================
# EQUIVALENCE TESTING
# =============================================================================

#' Run TOST equivalence test
#'
#' Tests whether an effect is small enough to be considered equivalent to zero
#'
#' @param group1 Numeric vector for group 1
#' @param group2 Numeric vector for group 2
#' @param bound Effect size bound for equivalence (default d = 0.3)
#' @return List with TOST results and conclusion
run_equivalence_test <- function(group1, group2, bound = 0.3) {

  n1 <- length(group1)
  n2 <- length(group2)
  m1 <- mean(group1, na.rm = TRUE)
  m2 <- mean(group2, na.rm = TRUE)
  sd1 <- sd(group1, na.rm = TRUE)
  sd2 <- sd(group2, na.rm = TRUE)

  # Run TOST
  result <- TOSTER::TOSTtwo(
    m1 = m1, m2 = m2,
    sd1 = sd1, sd2 = sd2,
    n1 = n1, n2 = n2,
    low_eqbound_d = -bound,
    high_eqbound_d = bound,
    alpha = 0.05,
    plot = FALSE
  )

  # Determine conclusion
  equivalent <- result$TOST_p1 < 0.05 & result$TOST_p2 < 0.05
  different <- result$NHST_p < 0.05

  conclusion <- case_when(
    equivalent & !different ~ "Equivalent (effect smaller than bound)",
    !equivalent & different ~ "Different (significant effect)",
    !equivalent & !different ~ "Inconclusive",
    TRUE ~ "Unexpected result"
  )

  return(list(
    tost_p_lower = result$TOST_p1,
    tost_p_upper = result$TOST_p2,
    nhst_p = result$NHST_p,
    is_equivalent = equivalent,
    is_different = different,
    conclusion = conclusion,
    bound_used = bound
  ))
}

# =============================================================================
# BAYESIAN ANALYSIS
# =============================================================================

#' Calculate Bayes Factor for independent samples
#'
#' @param group1 Numeric vector for group 1
#' @param group2 Numeric vector for group 2
#' @return List with BF and interpretation
bayes_factor_t <- function(group1, group2) {

  bf <- BayesFactor::ttestBF(group1, group2, paired = FALSE)
  bf10 <- exp(bf@bayesFactor$bf)
  bf01 <- 1 / bf10

  # Interpretation (Jeffreys, 1961)
  interpretation <- case_when(
    bf10 > 100 ~ "Extreme evidence for H1",
    bf10 > 30 ~ "Very strong evidence for H1",
    bf10 > 10 ~ "Strong evidence for H1",
    bf10 > 3 ~ "Moderate evidence for H1",
    bf10 > 1 ~ "Weak evidence for H1",
    bf01 > 100 ~ "Extreme evidence for H0",
    bf01 > 30 ~ "Very strong evidence for H0",
    bf01 > 10 ~ "Strong evidence for H0",
    bf01 > 3 ~ "Moderate evidence for H0",
    TRUE ~ "Weak/inconclusive evidence"
  )

  return(list(
    bf10 = bf10,
    bf01 = bf01,
    interpretation = interpretation
  ))
}

# =============================================================================
# POWER ANALYSIS
# =============================================================================

#' Calculate required sample size for independent t-test
#'
#' @param d Expected Cohen's d
#' @param power Desired power (default 0.80)
#' @param alpha Significance level (default 0.05)
#' @return Required n per group
required_n_ttest <- function(d, power = 0.80, alpha = 0.05) {

  result <- pwr::pwr.t.test(
    d = d,
    power = power,
    sig.level = alpha,
    type = "two.sample",
    alternative = "two.sided"
  )

  return(ceiling(result$n))
}

#' Calculate required sample size for one-way ANOVA
#'
#' @param f Expected Cohen's f (f = d/2 for 2 groups)
#' @param k Number of groups
#' @param power Desired power
#' @param alpha Significance level
#' @return Required total N
required_n_anova <- function(f, k, power = 0.80, alpha = 0.05) {

  result <- pwr::pwr.anova.test(
    f = f,
    k = k,
    power = power,
    sig.level = alpha
  )

  return(ceiling(result$n * k))
}

# =============================================================================
# VISUALIZATION HELPERS
# =============================================================================

#' Standard theme for experiment plots
#'
#' @param base_size Base font size
#' @return ggplot theme
theme_experiment <- function(base_size = 14) {

  theme_minimal(base_size = base_size) +
    theme(
      plot.title = element_text(face = "bold", size = base_size + 2),
      plot.subtitle = element_text(color = "gray40"),
      panel.grid.major.x = element_blank(),
      legend.position = "bottom"
    )
}

#' Color palette for conditions
#'
#' @param experiment Which experiment (1, 2, or 3)
#' @return Named vector of colors
condition_colors <- function(experiment = 1) {

  if (experiment == 1) {
    return(c(
      "BASELINE" = "#95a5a6",
      "HIGH_EFFORT" = "#e74c3c",
      "NR_PATTERN" = "#3498db",
      "RN_PATTERN" = "#9b59b6"
    ))
  } else if (experiment == 2) {
    return(c(
      "CONSISTENT" = "#27ae60",
      "EARNED" = "#e74c3c",
      "PATTERNED" = "#3498db"
    ))
  } else {
    return(c(
      "RANDOM" = "#e74c3c",
      "NR_PATTERN" = "#3498db"
    ))
  }
}

#' Create summary bar plot
#'
#' @param df Dataframe with condition and DV
#' @param dv_col Name of DV column
#' @param condition_col Name of condition column
#' @param title Plot title
#' @param y_label Y-axis label
#' @return ggplot object
plot_condition_means <- function(df, dv_col, condition_col = "condition",
                                  title = "", y_label = "") {

  summary_df <- df %>%
    group_by(.data[[condition_col]]) %>%
    summarise(
      mean = mean(.data[[dv_col]], na.rm = TRUE),
      se = sd(.data[[dv_col]], na.rm = TRUE) / sqrt(n()),
      .groups = "drop"
    )

  p <- ggplot(summary_df, aes(x = .data[[condition_col]], y = mean,
                               fill = .data[[condition_col]])) +
    geom_col(width = 0.7, color = "black") +
    geom_errorbar(aes(ymin = mean - se, ymax = mean + se),
                  width = 0.25, size = 0.8) +
    geom_jitter(data = df, aes(y = .data[[dv_col]]),
                width = 0.2, alpha = 0.3, size = 1.5, color = "black") +
    labs(title = title, y = y_label, x = NULL) +
    theme_experiment() +
    theme(legend.position = "none")

  return(p)
}

# =============================================================================
# DATA QUALITY FUNCTIONS
# =============================================================================

#' Check for outliers using IQR method
#'
#' @param x Numeric vector
#' @param multiplier IQR multiplier (default 1.5)
#' @return Logical vector (TRUE = outlier)
identify_outliers <- function(x, multiplier = 1.5) {

  q1 <- quantile(x, 0.25, na.rm = TRUE)
  q3 <- quantile(x, 0.75, na.rm = TRUE)
  iqr <- q3 - q1

  lower <- q1 - multiplier * iqr
  upper <- q3 + multiplier * iqr

  return(x < lower | x > upper)
}

#' Summarize missing data
#'
#' @param df Dataframe
#' @return Dataframe with missing counts per variable
summarize_missing <- function(df) {

  missing_df <- data.frame(
    variable = names(df),
    n_missing = sapply(df, function(x) sum(is.na(x))),
    pct_missing = sapply(df, function(x) mean(is.na(x)) * 100)
  )

  return(missing_df %>% arrange(desc(pct_missing)))
}

# =============================================================================
# THEORY-SPECIFIC FUNCTIONS
# =============================================================================

#' Evaluate support for Festinger vs Capaldi
#'
#' Takes results from contrasts and determines which theory is supported
#'
#' @param effort_vs_baseline Effect of effort condition vs baseline
#' @param pattern_vs_baseline Effect of pattern condition vs baseline
#' @param effort_vs_pattern Effect of effort vs pattern
#' @return List with verdict and reasoning
evaluate_theories <- function(effort_vs_baseline, pattern_vs_baseline,
                               effort_vs_pattern) {

  cat("=== THEORETICAL EVALUATION ===\n\n")

  # Festinger predictions:
  # - Effort should increase persistence (effort > baseline)
  # - Pattern shouldn't matter (pattern = baseline)
  festinger_effort <- effort_vs_baseline$p < 0.05 & effort_vs_baseline$d > 0
  festinger_pattern <- pattern_vs_baseline$p > 0.10

  # Capaldi predictions:
  # - Pattern should increase persistence (pattern > baseline)
  # - Effort shouldn't matter (effort = baseline)
  capaldi_pattern <- pattern_vs_baseline$p < 0.05 & pattern_vs_baseline$d > 0
  capaldi_effort <- effort_vs_baseline$p > 0.10

  # Critical test: effort vs pattern
  critical_festinger <- effort_vs_pattern$d > 0  # Effort wins
  critical_capaldi <- effort_vs_pattern$d < 0    # Pattern wins

  # Count support
  festinger_score <- sum(c(festinger_effort, festinger_pattern, critical_festinger))
  capaldi_score <- sum(c(capaldi_effort, capaldi_pattern, critical_capaldi))

  # Verdict
  if (capaldi_score > festinger_score) {
    verdict <- "CAPALDI SUPPORTED"
    reasoning <- "Pattern manipulation was effective; Effort manipulation was not."
  } else if (festinger_score > capaldi_score) {
    verdict <- "FESTINGER SUPPORTED"
    reasoning <- "Effort manipulation was effective; Pattern manipulation was not."
  } else {
    verdict <- "INCONCLUSIVE"
    reasoning <- "Both theories have partial support; more research needed."
  }

  cat("FESTINGER (Cognitive Dissonance):\n")
  cat(sprintf("  - Effort > Baseline: %s\n", ifelse(festinger_effort, "Supported", "Not supported")))
  cat(sprintf("  - Pattern = Baseline: %s\n", ifelse(festinger_pattern, "Supported", "Not supported")))
  cat(sprintf("  - Effort > Pattern: %s\n", ifelse(critical_festinger, "Supported", "Not supported")))
  cat(sprintf("  Score: %d/3\n\n", festinger_score))

  cat("CAPALDI (Sequential Theory):\n")
  cat(sprintf("  - Pattern > Baseline: %s\n", ifelse(capaldi_pattern, "Supported", "Not supported")))
  cat(sprintf("  - Effort = Baseline: %s\n", ifelse(capaldi_effort, "Supported", "Not supported")))
  cat(sprintf("  - Pattern > Effort: %s\n", ifelse(critical_capaldi, "Supported", "Not supported")))
  cat(sprintf("  Score: %d/3\n\n", capaldi_score))

  cat("VERDICT: ", verdict, "\n")
  cat("REASONING: ", reasoning, "\n\n")

  return(list(
    festinger_score = festinger_score,
    capaldi_score = capaldi_score,
    verdict = verdict,
    reasoning = reasoning
  ))
}

# =============================================================================
# CROSS-EXPERIMENT SYNTHESIS
# =============================================================================

#' Combine results from all three experiments
#'
#' @param exp1_results Results from Experiment 1
#' @param exp2_results Results from Experiment 2
#' @param exp3_results Results from Experiment 3
#' @return Combined summary
synthesize_results <- function(exp1_results = NULL, exp2_results = NULL,
                                exp3_results = NULL) {

  cat("=== CROSS-EXPERIMENT SYNTHESIS ===\n\n")

  synthesis <- data.frame(
    experiment = c("1: Treasure Hunt", "2: Career Choice", "3: Pattern Memory"),
    paradigm = c("Behavioral persistence", "Stated intentions", "Expectation/betting"),
    design = c("Between-subjects", "Within-subjects", "Between-subjects"),
    n = c(
      ifelse(is.null(exp1_results), NA, nrow(exp1_results$data)),
      ifelse(is.null(exp2_results), NA, nrow(exp2_results$data_wide)),
      ifelse(is.null(exp3_results), NA, nrow(exp3_results$data))
    ),
    festinger_support = c(NA, NA, NA),  # Fill in from results
    capaldi_support = c(NA, NA, NA)
  )

  cat("Summary Table:\n")
  print(synthesis)
  cat("\n")

  cat("Convergent Findings:\n")
  cat("  [To be filled in with actual results]\n\n")

  cat("Divergent Findings:\n")
  cat("  [To be filled in with actual results]\n\n")

  cat("Overall Conclusion:\n")
  cat("  [To be determined by actual data]\n\n")

  return(synthesis)
}

# =============================================================================
# MAIN
# =============================================================================

if (interactive()) {
  cat("Common Analysis Functions loaded.\n\n")
  cat("Available functions:\n")
  cat("  - load_packages(): Install and load required packages\n")
  cat("  - cohens_d_ci(): Cohen's d with CI\n")
  cat("  - run_equivalence_test(): TOST equivalence testing\n")
  cat("  - bayes_factor_t(): Bayesian t-test\n")
  cat("  - required_n_ttest(): Power analysis for t-test\n")
  cat("  - plot_condition_means(): Bar plot with error bars\n")
  cat("  - evaluate_theories(): Compare Festinger vs Capaldi support\n")
  cat("  - synthesize_results(): Combine all experiments\n\n")
}
