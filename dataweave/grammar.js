/**
 * @file DataWeave grammar for tree-sitter
 * @author M. Reifschneider
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const PREC = {
  LAMBDA: 1,
  IF: 2,
  MATCH: 3,
  DEFAULT: 4,
  LOGICAL_OR: 5,
  LOGICAL_AND: 6,
  RELATIONAL: 7,
  EQUALITY: 8,
  INFIX: 9,
  ADD: 10,
  MULTIPLY: 11,
  UNARY: 12,
  AS_IS: 13,
  CALL: 14,
  SELECTOR: 15,
  PRIMARY: 16,
};

export default grammar({
  name: 'dataweave',

  extras: $ => [
    /\s+/,
    $.line_comment,
    $.block_comment,
  ],

  conflicts: $ => [
    [$._expression, $.parameter],
    // A conditional key and a typed lambda share the prefix `(name:`.
    [$._object_key, $.lambda_expression],
  ],

  word: $ => $.identifier,

  rules: {
    document: $ => choice(
      seq(optional($.header), '---', optional($._expression)),
      $.header,
      $._expression
    ),

    // --- Comments ---
    line_comment: _ => token(seq('//', /.*/)),
    block_comment: _ => token(seq('/*', /[^*]*\*+([^/*][^*]*\*+)*/, '/')),

    // --- Header and Directives ---
    header: $ => repeat1($._directive),

    _directive: $ => choice(
      $.version_directive,
      $.output_directive,
      $.input_directive,
      $.var_directive,
      $.fun_directive,
      $.type_directive,
      $.namespace_directive,
      $.import_directive
    ),

    version_directive: $ => seq(
      choice('%dw', 'dw'),
      field('version', $.version_number)
    ),

    version_number: _ => /[0-9]+(\.[0-9]+)*/,

    output_directive: $ => seq(
      choice('%output', 'output'),
      field('mime_type', $.mime_type),
      repeat($.directive_parameter)
    ),

    input_directive: $ => seq(
      choice('%input', 'input'),
      field('name', $.identifier),
      field('mime_type', $.mime_type),
      repeat($.directive_parameter)
    ),

    mime_type: _ => /[a-zA-Z0-9_\.\-]+(\/[a-zA-Z0-9_\.\-\+]+)?/,

    directive_parameter: $ => seq(
      field('name', $.identifier),
      '=',
      field('value', choice($.string, $.number, $.boolean, $.identifier))
    ),

    var_directive: $ => seq(
      choice('%var', 'var'),
      field('name', $.identifier),
      '=',
      field('value', $._expression)
    ),

    fun_directive: $ => seq(
      choice('%fun', '%function', 'fun'),
      field('name', $.identifier),
      '(',
      optional($.parameter_list),
      ')',
      optional(seq(':', field('return_type', $._type))),
      '=',
      field('body', $._expression)
    ),

    type_directive: $ => seq(
      choice('%type', 'type'),
      field('name', $.identifier),
      '=',
      field('type', $._type)
    ),

    namespace_directive: $ => seq(
      choice('%ns', '%namespace', 'ns', 'namespace'),
      field('prefix', $.identifier),
      field('uri', choice($.namespace_uri, $.string, $.identifier))
    ),

    namespace_uri: _ => /[a-zA-Z][a-zA-Z0-9+.-]*:[^\s]+/,

    qualified_name: $ => seq(
      field('namespace', $.identifier),
      '#',
      field('name', choice($.identifier, $.string))
    ),

    import_directive: $ => seq(
      choice('%import', 'import'),
      choice(
        seq(
          choice('*', commaSep1($.identifier)),
          'from',
          field('module', choice($.module_path, $.identifier))
        ),
        field('module', choice($.module_path, $.identifier))
      ),
      optional(seq('as', field('alias', $.identifier)))
    ),

    module_path: $ => prec.left(seq(
      $.identifier,
      repeat1(seq('::', $.identifier))
    )),

    parameter_list: $ => seq(
      commaSep1($.parameter),
      optional(',')
    ),

    parameter: $ => seq(
      field('name', $.identifier),
      optional(seq(':', field('type', $._type))),
      optional(seq('=', field('default', $._expression)))
    ),

    // --- Types ---
    _type: $ => choice(
      $.type_name,
      $.type_with_parameters,
      $.array_type,
      $.object_type,
      $.union_type,
      $.intersection_type,
      $.parenthesized_type
    ),

    type_name: $ => choice(
      'Any',
      'String',
      'Number',
      'Boolean',
      'Array',
      'Object',
      'Date',
      'DateTime',
      'Time',
      'LocalDateTime',
      'LocalTime',
      'TimeZone',
      'Period',
      'Null',
      'Nothing',
      'Binary',
      'Regex',
      'Type',
      'Comparable',
      'Key',
      'Namespace',
      'Range',
      'Iterator',
      $.identifier
    ),

    type_with_parameters: $ => prec(PREC.CALL, seq(
      field('type', choice($.type_name, $.identifier)),
      field('parameters', $.object)
    )),

    array_type: $ => prec(1, choice(
      seq('Array', '<', $._type, '>'),
      seq($._type, '[', ']')
    )),

    object_type: $ => seq(
      '{',
      repeat(seq($.type_field, optional(','))),
      '}'
    ),

    type_field: $ => seq(
      field('name', choice($.identifier, $.string)),
      choice('?:', seq(optional('?'), ':')),
      field('type', $._type)
    ),

    union_type: $ => prec.left(1, seq($._type, '|', $._type)),
    intersection_type: $ => prec.left(2, seq($._type, '&', $._type)),
    parenthesized_type: $ => seq('(', $._type, ')'),

    // --- Expressions ---
    _expression: $ => choice(
      $._literal,
      $.identifier,
      $.module_path,
      $.anonymous_parameter,
      $.parenthesized_expression,
      $.unary_expression,
      $.binary_expression,
      $.infix_call,
      $.as_expression,
      $.is_expression,
      $.default_expression,
      $.if_expression,
      $.match_expression,
      $.do_expression,
      $.lambda_expression,
      $.call_expression,
      $.member_expression,
      $.descendant_expression,
      $.multi_value_expression,
      $.attribute_expression,
      $.key_expression,
      $.null_safe_selector,
      $.index_expression,
      $.filter_selector_expression
    ),

    _literal: $ => choice(
      $.object,
      $.array,
      $.string,
      $.number,
      $.boolean,
      $.null,
      $.regex,
      $.date_time
    ),

    // --- Object literal ---
    object: $ => seq(
      '{',
      repeat(seq($.object_entry, optional(','))),
      '}'
    ),

    object_entry: $ => choice(
      $.pair,
      $.conditional_pair,
      $.dynamic_pair,
      $.enclosed_pair,
      $.spread_expression
    ),

    pair: $ => seq(
      field('key', $._object_key),
      ':',
      field('value', $._expression),
      optional($.conditional_clause)
    ),

    conditional_pair: $ => seq(
      '(',
      $.pair,
      ')',
      optional($.conditional_clause)
    ),

    dynamic_pair: $ => seq(
      '(',
      field('key', $._expression),
      ')',
      ':',
      field('value', $._expression),
      optional($.conditional_clause)
    ),

    enclosed_pair: $ => seq(
      '(',
      '(',
      $.pair,
      ')',
      ')',
      optional($.conditional_clause)
    ),

    spread_expression: $ => seq(
      choice(
        seq('{(', $._expression, ')}'),
        seq('(', $._expression, ')')
      )
    ),

    conditional_clause: $ => seq(
      'if',
      '(',
      field('condition', $._expression),
      ')'
    ),

    _object_key: $ => prec(PREC.LAMBDA, choice(
      $.qualified_name,
      $.identifier,
      $.string,
      $.number
    )),

    // --- Array literal ---
    array: $ => seq(
      '[',
      repeat(seq($._expression, optional(','))),
      ']'
    ),

    // --- Literals ---
    boolean: _ => choice('true', 'false'),
    null: _ => 'null',

    number: _ => token(choice(
      /0x[0-9a-fA-F]+/,
      /-?[0-9]+(\.[0-9]+)?([eE][+-]?[0-9]+)?/
    )),

    regex: _ => token(seq('/', /([^/\\]|\\.)*/, '/', optional(/[gimsuy]+/))),

    date_time: _ => token(seq('|', /[^|\r\n]+/, '|')),

    // --- Strings & Interpolation ---
    string: $ => choice(
      $.double_quoted_string,
      $.single_quoted_string,
      $.triple_quoted_string
    ),

    double_quoted_string: $ => seq(
      '"',
      repeat(choice(
        $.string_content,
        $.escape_sequence,
        $.interpolation,
        '$'
      )),
      '"'
    ),

    single_quoted_string: $ => seq(
      "'",
      repeat(choice(
        $.single_quote_content,
        $.escape_sequence
      )),
      "'"
    ),

    triple_quoted_string: $ => seq(
      '"""',
      repeat(choice(
        $.triple_quote_content,
        $.escape_sequence,
        $.interpolation,
        '$'
      )),
      '"""'
    ),

    string_content: _ => token.immediate(prec(1, /[^"\\$]+/)),
    single_quote_content: _ => token.immediate(prec(1, /[^'\\]+/)),
    triple_quote_content: _ => token.immediate(choice(/[^"\\$]+/, '"', '""')),
    escape_sequence: _ => token.immediate(seq('\\', /./)),
    interpolation: $ => seq('$(', field('expression', $._expression), ')'),

    // --- Identifiers ---
    identifier: _ => /[a-zA-Z_][a-zA-Z0-9_]*/,
    anonymous_parameter: _ => token(/\${1,3}/),

    parenthesized_expression: $ => seq('(', $._expression, ')'),

    // --- Operators ---
    unary_expression: $ => prec(PREC.UNARY, choice(
      seq('-', $._expression),
      seq('!', $._expression),
      seq('not', $._expression)
    )),

    binary_expression: $ => choice(
      prec.left(PREC.MULTIPLY, seq($._expression, choice('*', '/'), $._expression)),
      prec.left(PREC.ADD, seq($._expression, choice('+', '-', '++', '--', '<<', '>>'), $._expression)),
      prec.left(PREC.RELATIONAL, seq($._expression, choice('<', '<=', '>', '>='), $._expression)),
      prec.left(PREC.EQUALITY, seq($._expression, choice('==', '!=', '~='), $._expression)),
      prec.left(PREC.LOGICAL_AND, seq($._expression, 'and', $._expression)),
      prec.left(PREC.LOGICAL_OR, seq($._expression, 'or', $._expression))
    ),

    infix_call: $ => prec.left(PREC.INFIX, seq(
      field('left', $._expression),
      field('function', $.identifier),
      field('right', $._expression)
    )),

    as_expression: $ => prec.left(PREC.AS_IS, seq(
      field('expression', $._expression),
      'as',
      field('type', $._type)
    )),

    is_expression: $ => prec.left(PREC.AS_IS, seq(
      field('expression', $._expression),
      'is',
      field('type', $._type)
    )),

    default_expression: $ => prec.right(PREC.DEFAULT, seq(
      field('expression', $._expression),
      choice('default', '?:'),
      field('default', $._expression)
    )),

    // --- Control Flow ---
    if_expression: $ => prec.right(PREC.IF, seq(
      'if',
      '(',
      field('condition', $._expression),
      ')',
      field('consequence', $._expression),
      'else',
      field('alternative', $._expression)
    )),

    match_expression: $ => prec(PREC.MATCH, seq(
      field('value', $._expression),
      'match',
      '{',
      repeat($.match_case),
      optional($.match_else),
      '}'
    )),

    match_case: $ => seq(
      'case',
      choice(
        seq(
          optional(seq(field('variable', $.identifier), ':')),
          field('pattern', choice($.string, $.number, $.boolean, $.null))
        ),
        seq(
          optional(field('variable', $.identifier)),
          choice(
            seq('matches', field('pattern', $.regex)),
            seq(
              optional(seq('is', field('type', $._type))),
              optional(seq('if', field('guard', $._expression)))
            )
          )
        )
      ),
      '->',
      field('consequence', $._expression)
    ),

    match_else: $ => seq(
      'else',
      optional(field('variable', $.identifier)),
      '->',
      field('consequence', $._expression)
    ),

    do_expression: $ => seq(
      'do',
      '{',
      optional(seq(field('header', $.header), '---')),
      field('body', $._expression),
      '}'
    ),

    // --- Lambdas & Function Calls ---
    lambda_expression: $ => prec.right(PREC.LAMBDA, seq(
      field('parameters', choice(
        seq('(', optional($.parameter_list), ')'),
        $.identifier
      )),
      optional(seq(':', field('return_type', $._type))),
      '->',
      field('body', $._expression)
    )),

    call_expression: $ => prec(PREC.CALL, seq(
      field('function', $._expression),
      '(',
      optional(commaSep($._expression)),
      ')'
    )),

    // --- Selectors ---
    member_expression: $ => prec.left(PREC.SELECTOR, seq(
      field('object', $._expression),
      '.',
      field('property', choice($.identifier, $.string, $.qualified_name))
    )),

    descendant_expression: $ => prec.left(PREC.SELECTOR, seq(
      field('object', $._expression),
      '..',
      field('property', choice($.identifier, $.string, $.qualified_name))
    )),

    multi_value_expression: $ => prec.left(PREC.SELECTOR, seq(
      field('object', $._expression),
      '.*',
      field('property', choice($.identifier, $.string, $.qualified_name))
    )),

    attribute_expression: $ => prec.left(PREC.SELECTOR, seq(
      field('object', $._expression),
      choice('.@', '@'),
      field('attribute', choice($.identifier, $.string, $.qualified_name))
    )),

    key_expression: $ => prec.left(PREC.SELECTOR, seq(
      field('object', $._expression),
      '.&',
      field('key', choice($.identifier, $.string, $.qualified_name))
    )),

    null_safe_selector: $ => prec.left(PREC.SELECTOR, choice(
      seq(field('object', $._expression), choice('?.', '.?'), field('property', choice($.identifier, $.string))),
      seq(field('object', $._expression), '?')
    )),

    index_expression: $ => prec(PREC.SELECTOR, seq(
      field('collection', $._expression),
      '[',
      choice(
        field('index', $._expression),
        seq(field('from', $._expression), 'to', field('to', $._expression))
      ),
      ']'
    )),

    filter_selector_expression: $ => prec(PREC.SELECTOR, seq(
      field('collection', $._expression),
      '[?',
      field('condition', $._expression),
      ']'
    )),
  },
});

/**
 * Creates a rule to match one or more occurrences of `rule` separated by comma.
 *
 * @param {RuleOrLiteral} rule
 * @returns {SeqRule}
 */
function commaSep1(rule) {
  return seq(rule, repeat(seq(choice(',', /\r?\n/), rule)));
}

/**
 * Creates a rule to match zero or more occurrences of `rule` separated by comma.
 *
 * @param {RuleOrLiteral} rule
 * @returns {ChoiceRule}
 */
function commaSep(rule) {
  return optional(commaSep1(rule));
}
