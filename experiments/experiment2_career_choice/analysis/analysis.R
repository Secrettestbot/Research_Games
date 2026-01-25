# =============================================================================
# EXPERIMENT 2: CAREER CHOICE STUDY - DATA ANALYSIS SCRIPT
# =============================================================================
#
# Description:
#   Complete analysis script for Experiment 2 (within-subjects career survey)
#   comparing Festinger's Cognitive Dissonance Theory vs Capaldi's Sequential Theory
#
# Design: Within-Subjects (repeated measures)
#   All participants see all 3 scenarios in randomized order:
#   - Company A: CONSISTENT (spotlight every month)
#   - Company B: EARNED (4 hours work per spotlight)
#   - Company C: PATTERNED (alternating: quiet → spotlight)
#
# Primary DVs:
#   1. Tenure intention (months before leaving, 0-24)
#   2. Recognition value (0-100)
#   3. Salary equivalent ($0-$20,000)
#   4. Attractiveness (1-7)
#
# Theoretical Predictions:
#   FESTINGER: B > A = C (effort increases value)
#   CAPALDI: C > A > B (N→R pattern creates expectation)
#
# Author: Research Games Project
# Date: January 2025
# =============================================================================

# =============================================================================
# SETUP AND LIBRARIES
# =============================================================================

# Load required libraries
library(tidyverse)    # Data manipulation
library(afex)         # Repeated measures ANOVA
library(emmeans)      # Estimated marginal means
library(effsize)      # Effect sizes
library(TOSTER)       # Equivalence testing
library(lavaan)       # Mediation analysis
library(lme4)         # Mixed effects models
library(lmerTest)     # p-values for lmer
library(patchwork)    # Combining plots

set.seed(42)

# =============================================================================
# DATA LOADING AND PREPROCESSING
# =============================================================================

#' Load and preprocess Experiment 2 data
#'
#' @param data_dir Path to directory containing JSON files
#' @return List with wide and long format dataframes
load_career_data <- function(data_dir = "data/") {

  # Find all JSON files
  json_files <- list.files(data_dir, pattern = "career_survey_.*\\.json$",
                           full.names = TRUE)

  cat(sprintf("Found %d data files\n", length(json_files)))

  # Read and combine
  data_list <- lapply(json_files, function(f) {
    tryCatch({
      jsonlite::fromJSON(f)
    }, error = function(e) {
      warning(paste("Error reading:", f))
      NULL
    })
  })

  data_list <- data_list[!sapply(data_list, is.null)]

  # Extract to wide format (one row per participant)
  df_wide <- data.frame(
    participant_id = sapply(data_list, function(x) x$participant_id),
    scenario_order = sapply(data_list, function(x) paste(x$scenario_order, collapse = "-")),

    # Company A (CONSISTENT) responses
    tenure_A = sapply(data_list, function(x)
      x$scenario_responses$A$tenure %||% NA),
    value_A = sapply(data_list, function(x)
      x$scenario_responses$A$value %||% NA),
    attractiveness_A = sapply(data_list, function(x)
      x$scenario_responses$A$attractiveness %||% NA),
    salary_equiv_A = sapply(data_list, function(x)
      x$scenario_responses$A$salary_equivalent %||% NA),

    # Company B (EARNED) responses
    tenure_B = sapply(data_list, function(x)
      x$scenario_responses$B$tenure %||% NA),
    value_B = sapply(data_list, function(x)
      x$scenario_responses$B$value %||% NA),
    attractiveness_B = sapply(data_list, function(x)
      x$scenario_responses$B$attractiveness %||% NA),
    salary_equiv_B = sapply(data_list, function(x)
      x$scenario_responses$B$salary_equivalent %||% NA),

    # Company C (PATTERNED) responses
    tenure_C = sapply(data_list, function(x)
      x$scenario_responses$C$tenure %||% NA),
    value_C = sapply(data_list, function(x)
      x$scenario_responses$C$value %||% NA),
    attractiveness_C = sapply(data_list, function(x)
      x$scenario_responses$C$attractiveness %||% NA),
    salary_equiv_C = sapply(data_list, function(x)
      x$scenario_responses$C$salary_equivalent %||% NA),

    # Mechanism measures
    effort_value = sapply(data_list, function(x)
      x$mechanism_responses$effort_value %||% NA),
    pattern_expect = sapply(data_list, function(x)
      x$mechanism_responses$pattern_expect %||% NA),

    # Working memory
    wm_score = sapply(data_list, function(x)
      x$working_memory$score %||% NA),

    # Exclusion flag
    should_exclude = sapply(data_list, function(x)
      x$should_exclude %||% FALSE),

    stringsAsFactors = FALSE
  )

  # Convert to long format for repeated measures
  df_long <- df_wide %>%
    pivot_longer(
      cols = matches("^(tenure|value|attractiveness|salary_equiv)_[ABC]$"),
      names_to = c("measure", "company"),
      names_pattern = "(.*)_([ABC])$",
      values_to = "response"
    ) %>%
    pivot_wider(
      names_from = measure,
      values_from = response
    ) %>%
    mutate(
      company = factor(company, levels = c("A", "B", "C"),
                       labels = c("CONSISTENT", "EARNED", "PATTERNED"))
    )

  return(list(wide = df_wide, long = df_long))
}

#' Apply preregistered exclusion criteria
#'
#' @param df_wide Wide format dataframe
#' @return Filtered dataframe
apply_exclusions <- function(df_wide) {

  cat("=== APPLYING EXCLUSION CRITERIA ===\n\n")

  n_original <- nrow(df_wide)

  # Exclude based on manipulation checks (stored in data)
  df_clean <- df_wide %>%
    filter(!should_exclude)

  # Additional exclusions: missing primary DV
  df_clean <- df_clean %>%
    filter(!is.na(tenure_A) & !is.na(tenure_B) & !is.na(tenure_C))

  n_final <- nrow(df_clean)

  cat(sprintf("Original N: %d\n", n_original))
  cat(sprintf("Final N: %d\n", n_final))
  cat(sprintf("Excluded: %d (%.1f%%)\n\n",
              n_original - n_final,
              100 * (n_original - n_final) / n_original))

  return(df_clean)
}

# =============================================================================
# DESCRIPTIVE STATISTICS
# =============================================================================

#' Calculate descriptive statistics by company
#'
#' @param df_long Long format dataframe
#' @return Summary dataframe
descriptive_stats <- function(df_long) {

  cat("=== DESCRIPTIVE STATISTICS ===\n\n")

  # Primary DV: Tenure
  tenure_summary <- df_long %>%
    group_by(company) %>%
    summarise(
      n = n(),
      mean_tenure = mean(tenure, na.rm = TRUE),
      sd_tenure = sd(tenure, na.rm = TRUE),
      se_tenure = sd_tenure / sqrt(n),
      median_tenure = median(tenure, na.rm = TRUE),
      .groups = "drop"
    )

  cat("TENURE INTENTION (months):\n")
  print(tenure_summary)
  cat("\n")

  # All DVs
  all_dvs <- df_long %>%
    group_by(company) %>%
    summarise(
      mean_tenure = mean(tenure, na.rm = TRUE),
      mean_value = mean(value, na.rm = TRUE),
      mean_attractive = mean(attractiveness, na.rm = TRUE),
      mean_salary = mean(salary_equiv, na.rm = TRUE),
      .groups = "drop"
    )

  cat("ALL DEPENDENT VARIABLES:\n")
  print(all_dvs)
  cat("\n")

  return(list(tenure = tenure_summary, all_dvs = all_dvs))
}

# =============================================================================
# PRIMARY ANALYSIS: REPEATED MEASURES ANOVA
# =============================================================================

#' Run repeated measures ANOVA for primary DV
#'
#' @param df_long Long format dataframe
#' @return ANOVA model
run_repeated_measures_anova <- function(df_long) {

  cat("=== PRIMARY ANALYSIS: REPEATED MEASURES ANOVA ===\n\n")

  # Use afex for easy repeated measures
  model <- aov_ez(
    id = "participant_id",
    dv = "tenure",
    data = df_long,
    within = "company",
    anova_table = list(es = "pes")
  )

  cat("ANOVA Results:\n")
  print(summary(model))
  cat("\n")

  # Sphericity check (Mauchly's test)
  cat("Note: afex applies Greenhouse-Geisser correction if sphericity violated\n\n")

  return(model)
}

# =============================================================================
# PLANNED CONTRASTS
# =============================================================================

#' Run preregistered planned contrasts
#'
#' @param model ANOVA model
#' @param df_long Long format data
run_planned_contrasts <- function(model, df_long) {

  cat("=== PLANNED CONTRASTS (PREREGISTERED) ===\n\n")

  # Get estimated marginal means
  emm <- emmeans(model, ~ company)

  cat("Estimated Marginal Means:\n")
  print(summary(emm))
  cat("\n")

  # Define contrasts
  # Order: CONSISTENT (A), EARNED (B), PATTERNED (C)

  contrast_list <- list(
    # Test 1: Effort effect (Festinger's prediction)
    # FESTINGER predicts: EARNED (B) > CONSISTENT (A)
    "Effort: EARNED vs CONSISTENT" = c(-1, 1, 0),

    # Test 2: Pattern effect (Capaldi's prediction)
    # CAPALDI predicts: PATTERNED (C) > CONSISTENT (A)
    "Pattern: PATTERNED vs CONSISTENT" = c(-1, 0, 1),

    # Test 3: CRITICAL - Effort vs Pattern
    # FESTINGER predicts: EARNED >= PATTERNED
    # CAPALDI predicts: PATTERNED > EARNED
    "CRITICAL: EARNED vs PATTERNED" = c(0, 1, -1)
  )

  contrasts_result <- contrast(emm, method = contrast_list, adjust = "none")

  cat("Planned Contrast Results:\n")
  print(summary(contrasts_result, infer = TRUE))
  cat("\n")

  # Effect sizes (within-subjects Cohen's d)
  cat("Effect Sizes (Cohen's d for repeated measures):\n")

  contrast_df <- as.data.frame(summary(contrasts_result))

  # Calculate within-subjects d using pooled SD
  pooled_sd <- sd(df_long$tenure, na.rm = TRUE)

  for (i in 1:nrow(contrast_df)) {
    d <- contrast_df$estimate[i] / pooled_sd
    cat(sprintf("  %s: d = %.3f\n", contrast_df$contrast[i], d))
  }
  cat("\n")

  return(contrasts_result)
}

# =============================================================================
# CONVERGENT VALIDITY: MULTIPLE DVs
# =============================================================================

#' Test same pattern across all DVs
#'
#' @param df_long Long format data
run_convergent_validity <- function(df_long) {

  cat("=== CONVERGENT VALIDITY: MULTIPLE DVs ===\n\n")

  dvs <- c("tenure", "value", "attractiveness", "salary_equiv")

  results <- data.frame()

  for (dv in dvs) {
    # Skip if variable doesn't exist
    if (!(dv %in% names(df_long))) next

    # Run ANOVA
    model <- aov_ez(
      id = "participant_id",
      dv = dv,
      data = df_long,
      within = "company"
    )

    # Get EMMs
    emm <- emmeans(model, ~ company)

    # Critical contrast: EARNED vs PATTERNED
    contrast_result <- contrast(emm,
                                 method = list("EARNED vs PATTERNED" = c(0, 1, -1)))

    contrast_summary <- as.data.frame(summary(contrast_result))

    results <- rbind(results, data.frame(
      DV = dv,
      estimate = contrast_summary$estimate,
      SE = contrast_summary$SE,
      t = contrast_summary$t.ratio,
      p = contrast_summary$p.value,
      direction = ifelse(contrast_summary$estimate > 0, "EARNED > PATTERNED", "PATTERNED > EARNED")
    ))
  }

  cat("EARNED vs PATTERNED contrast across all DVs:\n")
  print(results)
  cat("\n")

  # Count consistent direction
  n_festinger <- sum(results$estimate > 0)
  n_capaldi <- sum(results$estimate < 0)

  cat(sprintf("DVs favoring Festinger (EARNED > PATTERNED): %d/%d\n", n_festinger, nrow(results)))
  cat(sprintf("DVs favoring Capaldi (PATTERNED > EARNED): %d/%d\n", n_capaldi, nrow(results)))
  cat("\n")

  return(results)
}

# =============================================================================
# WORKING MEMORY MODERATION
# =============================================================================

#' Test whether working memory moderates pattern effect
#'
#' @param df_wide Wide format data
run_wm_moderation <- function(df_wide) {

  cat("=== WORKING MEMORY MODERATION ===\n\n")

  # Check if WM variable exists
  if (!("wm_score" %in% names(df_wide))) {
    cat("Working memory scores not found in data.\n\n")
    return(NULL)
  }

  # Median split
  df_wide <- df_wide %>%
    mutate(
      wm_group = ifelse(wm_score >= median(wm_score, na.rm = TRUE), "High", "Low")
    )

  # Convert to long for analysis
  df_mod <- df_wide %>%
    select(participant_id, wm_group, tenure_A, tenure_C) %>%
    pivot_longer(
      cols = starts_with("tenure"),
      names_to = "company",
      values_to = "tenure",
      names_prefix = "tenure_"
    ) %>%
    mutate(company = factor(company))

  # Mixed ANOVA: Company (within) × WM (between)
  model <- aov_ez(
    id = "participant_id",
    dv = "tenure",
    data = df_mod,
    within = "company",
    between = "wm_group"
  )

  cat("Company × Working Memory Interaction:\n")
  print(summary(model))
  cat("\n")

  # Simple effects if interaction significant
  if (summary(model)$univariate.tests["company:wm_group", "Pr(>F)"] < 0.10) {
    cat("Simple effects (pattern effect by WM group):\n")

    emm <- emmeans(model, ~ company | wm_group)
    print(pairs(emm))
  }

  return(model)
}

# =============================================================================
# MEDIATION ANALYSIS
# =============================================================================

#' Test Capaldi's mediation mechanism
#'
#' Pattern detected → Expectation → Tenure
#'
#' @param df_wide Wide format data with mechanism measures
run_capaldi_mediation <- function(df_wide) {

  cat("=== MEDIATION ANALYSIS (CAPALDI) ===\n\n")

  # Check if variables exist
  if (!("pattern_expect" %in% names(df_wide))) {
    cat("Mechanism variables not found.\n\n")
    return(NULL)
  }

  # Compute C vs A difference score
  df_med <- df_wide %>%
    mutate(
      tenure_diff = tenure_C - tenure_A,  # Pattern effect on tenure
      pattern_effect = 1  # Dummy for pattern condition
    ) %>%
    filter(!is.na(tenure_diff) & !is.na(pattern_expect))

  # Simple mediation: pattern_expect mediates tenure_C
  model <- '
    # Direct effect of expectation on tenure (C condition)
    tenure_C ~ c*pattern_expect

    # Indirect path through perceived predictability
    # (would need more variables for full mediation)

    # Report total effect
  '

  # For now, report correlation
  cor_expect_tenure <- cor(df_med$pattern_expect, df_med$tenure_C, use = "complete.obs")

  cat(sprintf("Correlation: Pattern Expectation × Tenure (C): r = %.3f\n\n", cor_expect_tenure))

  # Test if expectation predicts tenure
  lm_result <- lm(tenure_C ~ pattern_expect, data = df_med)
  cat("Regression: Pattern Expectation → Tenure (Company C):\n")
  print(summary(lm_result))
  cat("\n")

  return(lm_result)
}

#' Test Festinger's mediation mechanism
#'
#' Perceived effort → Value → Tenure
#'
#' @param df_wide Wide format data
run_festinger_mediation <- function(df_wide) {

  cat("=== MEDIATION ANALYSIS (FESTINGER) ===\n\n")

  if (!("effort_value" %in% names(df_wide))) {
    cat("Mechanism variables not found.\n\n")
    return(NULL)
  }

  df_med <- df_wide %>%
    filter(!is.na(effort_value) & !is.na(tenure_B))

  # Correlation
  cor_effort_tenure <- cor(df_med$effort_value, df_med$tenure_B, use = "complete.obs")

  cat(sprintf("Correlation: Effort-Value belief × Tenure (B): r = %.3f\n\n", cor_effort_tenure))

  # Regression
  lm_result <- lm(tenure_B ~ effort_value, data = df_med)
  cat("Regression: Effort-Value belief → Tenure (Company B):\n")
  print(summary(lm_result))
  cat("\n")

  return(lm_result)
}

# =============================================================================
# VISUALIZATIONS
# =============================================================================

#' Create main results plot
#'
#' @param df_long Long format data
#' @return ggplot object
plot_main_results <- function(df_long) {

  summary_df <- df_long %>%
    group_by(company) %>%
    summarise(
      mean = mean(tenure, na.rm = TRUE),
      se = sd(tenure, na.rm = TRUE) / sqrt(n()),
      .groups = "drop"
    )

  company_labels <- c(
    "CONSISTENT" = "Consistent\n(Monthly)",
    "EARNED" = "Earned\n(4 hrs work)",
    "PATTERNED" = "Patterned\n(N→R)"
  )

  p <- ggplot(summary_df, aes(x = company, y = mean, fill = company)) +
    geom_col(width = 0.7, color = "black") +
    geom_errorbar(aes(ymin = mean - se, ymax = mean + se),
                  width = 0.2, size = 0.8) +
    scale_x_discrete(labels = company_labels) +
    scale_fill_manual(values = c(
      "CONSISTENT" = "#27ae60",
      "EARNED" = "#e74c3c",
      "PATTERNED" = "#3498db"
    )) +
    labs(
      title = "Experiment 2: How Long Would You Stay After Recognition Ends?",
      subtitle = "Within-subjects comparison of three recognition programs",
      y = "Months Before Looking for Other Jobs",
      x = NULL,
      caption = "Error bars = ±1 SE"
    ) +
    theme_minimal(base_size = 14) +
    theme(
      legend.position = "none",
      plot.title = element_text(face = "bold"),
      panel.grid.major.x = element_blank()
    ) +
    coord_cartesian(ylim = c(0, 26))

  return(p)
}

#' Create spaghetti plot showing individual patterns
#'
#' @param df_long Long format data
#' @return ggplot object
plot_individual_trajectories <- function(df_long) {

  company_labels <- c(
    "CONSISTENT" = "A\nConsistent",
    "EARNED" = "B\nEarned",
    "PATTERNED" = "C\nPatterned"
  )

  p <- ggplot(df_long, aes(x = company, y = tenure, group = participant_id)) +
    geom_line(alpha = 0.15, color = "gray50") +
    stat_summary(aes(group = 1), fun = mean, geom = "line",
                 color = "red", size = 2) +
    stat_summary(aes(group = 1), fun = mean, geom = "point",
                 color = "red", size = 4) +
    scale_x_discrete(labels = company_labels) +
    labs(
      title = "Individual Response Patterns",
      subtitle = "Gray lines = individual participants; Red line = group mean",
      y = "Tenure (months)",
      x = "Company"
    ) +
    theme_minimal(base_size = 14)

  return(p)
}

#' Create mechanism plot
#'
#' @param df_wide Wide format data
#' @return ggplot object
plot_mechanisms <- function(df_wide) {

  # Festinger mechanism
  p1 <- ggplot(df_wide, aes(x = effort_value, y = tenure_B)) +
    geom_point(alpha = 0.4, size = 2) +
    geom_smooth(method = "lm", color = "#e74c3c", fill = "#fadbd8") +
    labs(
      title = "Festinger Mechanism",
      subtitle = "Company B (Earned)",
      x = '"Effort makes recognition valuable" (1-7)',
      y = "Tenure intention (months)"
    ) +
    theme_minimal(base_size = 12)

  # Capaldi mechanism
  p2 <- ggplot(df_wide, aes(x = pattern_expect, y = tenure_C)) +
    geom_point(alpha = 0.4, size = 2) +
    geom_smooth(method = "lm", color = "#3498db", fill = "#d4e6f1") +
    labs(
      title = "Capaldi Mechanism",
      subtitle = "Company C (Patterned)",
      x = '"After quiet month, I expect spotlight" (1-7)',
      y = "Tenure intention (months)"
    ) +
    theme_minimal(base_size = 12)

  combined <- p1 + p2

  return(combined)
}

# =============================================================================
# FULL ANALYSIS PIPELINE
# =============================================================================

#' Run complete analysis
#'
#' @param data_dir Directory with data files
#' @param output_dir Directory for outputs
run_full_analysis <- function(data_dir = "data/", output_dir = "output/") {

  cat("====================================================================\n")
  cat("EXPERIMENT 2: CAREER CHOICE STUDY - FULL ANALYSIS\n")
  cat("====================================================================\n\n")

  # Create output directory
  if (!dir.exists(output_dir)) {
    dir.create(output_dir, recursive = TRUE)
  }

  # Load data
  data <- load_career_data(data_dir)

  # Apply exclusions
  df_clean_wide <- apply_exclusions(data$wide)

  # Recreate long format from cleaned data
  df_clean_long <- df_clean_wide %>%
    pivot_longer(
      cols = matches("^tenure_[ABC]$"),
      names_to = "company",
      values_to = "tenure",
      names_prefix = "tenure_"
    ) %>%
    mutate(
      company = factor(company, levels = c("A", "B", "C"),
                       labels = c("CONSISTENT", "EARNED", "PATTERNED"))
    )

  # Descriptives
  descriptives <- descriptive_stats(df_clean_long)

  # Primary ANOVA
  model <- run_repeated_measures_anova(df_clean_long)

  # Planned contrasts
  contrasts <- run_planned_contrasts(model, df_clean_long)

  # Convergent validity
  # convergent <- run_convergent_validity(df_clean_long)

  # Working memory moderation
  wm_mod <- run_wm_moderation(df_clean_wide)

  # Mediation
  med_capaldi <- run_capaldi_mediation(df_clean_wide)
  med_festinger <- run_festinger_mediation(df_clean_wide)

  # Visualizations
  cat("Creating visualizations...\n")

  p1 <- plot_main_results(df_clean_long)
  p2 <- plot_individual_trajectories(df_clean_long)
  # p3 <- plot_mechanisms(df_clean_wide)

  # Save plots
  ggsave(file.path(output_dir, "exp2_main_results.png"), p1,
         width = 10, height = 8, dpi = 300)
  ggsave(file.path(output_dir, "exp2_individual_trajectories.png"), p2,
         width = 10, height = 6, dpi = 300)

  cat("\n")
  cat("====================================================================\n")
  cat("ANALYSIS COMPLETE\n")
  cat("====================================================================\n")

  return(list(
    data_wide = df_clean_wide,
    data_long = df_clean_long,
    descriptives = descriptives,
    anova = model,
    contrasts = contrasts,
    wm_moderation = wm_mod
  ))
}

# =============================================================================
# SIMULATED DATA FOR TESTING
# =============================================================================

#' Generate simulated data for testing analysis
#'
#' @param n Number of participants
#' @return List with wide and long format data
generate_simulated_data <- function(n = 240) {

  cat("Generating simulated data (n = ", n, ")...\n\n", sep = "")

  set.seed(42)

  # Based on Capaldi predictions:
  # CONSISTENT (A): Mean = 8 months
  # EARNED (B): Mean = 8 months (same as A - Festinger NOT supported)
  # PATTERNED (C): Mean = 14 months (Capaldi supported)

  df_wide <- data.frame(
    participant_id = 1:n,
    should_exclude = FALSE,

    # Tenure responses (within-subjects correlation ~ 0.5)
    tenure_A = round(pmax(0, pmin(24, rnorm(n, 8, 5)))),
    tenure_B = round(pmax(0, pmin(24, rnorm(n, 8, 5)))),
    tenure_C = round(pmax(0, pmin(24, rnorm(n, 14, 5)))),

    # Mechanism measures
    effort_value = round(pmax(1, pmin(7, rnorm(n, 4, 1.5)))),
    pattern_expect = round(pmax(1, pmin(7, rnorm(n, 5, 1.2)))),

    # Working memory
    wm_score = round(pmax(0, pmin(7, rnorm(n, 4, 1.5))))
  )

  # Add within-subjects correlation
  df_wide <- df_wide %>%
    mutate(
      tenure_B = round(0.5 * tenure_A + 0.5 * tenure_B),
      tenure_C = round(0.3 * tenure_A + 0.7 * tenure_C)
    )

  # Convert to long
  df_long <- df_wide %>%
    pivot_longer(
      cols = starts_with("tenure"),
      names_to = "company",
      values_to = "tenure",
      names_prefix = "tenure_"
    ) %>%
    mutate(
      company = factor(company, levels = c("A", "B", "C"),
                       labels = c("CONSISTENT", "EARNED", "PATTERNED"))
    )

  return(list(wide = df_wide, long = df_long))
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

if (interactive()) {
  cat("To run the full analysis, use:\n")
  cat("  results <- run_full_analysis('path/to/data/')\n\n")
  cat("To test with simulated data:\n")
  cat("  data <- generate_simulated_data()\n")
  cat("  descriptive_stats(data$long)\n")
  cat("  model <- run_repeated_measures_anova(data$long)\n")
}
