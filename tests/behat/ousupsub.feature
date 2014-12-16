@editor @editor_ousupsub @ousupsub @ousupsub_combined @_bug_phantomjs
Feature: ousupsub subscript button
  To format text in ousupsub, I need to use both the superscript and subscript buttons.
  The tests must be built initially in a specific order because we are relying on CSS selectors to select
  specific pieces of text. It is very easy to get into a situation where pieces of text cannot be selected.
  
  We are using Rangy to create a selection range between specific nodes https://code.google.com/p/rangy/wiki/RangySelection
  and document.querySelector() https://developer.mozilla.org/en-US/docs/Web/API/document.querySelector
  to select the specific nodes. This requires css selector syntax http://www.w3schools.com/cssref/css_selectors.asp
  
  Many of these tests highlight specific bugs in the existing atto/ousupsub editor implementation while also
  demonstrating how to use the text selection behat method created for this plugin.

  @javascript
  Scenario: Applying Subscript and Superscript on text
    Given I log in as "admin"
    And I navigate to "Edit profile" node in "My profile settings"
    And I set the field "Text editor" to "ousupsub HTML editor"
    And I set the field "Description" to "<p>Superscript and Subscript</p>"
    Then I should see "<p>Superscript and Subscript</p>" in the "Description" ousupsub editor
    And I press "Update profile"
    And I follow "Edit profile"

    # Apply subscript
    When I select the range "'',16,'',25" in the "Description" ousupsub editor
    And I click on "Subscript" "button"
    Then I should see "Superscript and <sub>Subscript</sub>" in the "Description" ousupsub editor

    # Apply superscript
    When I select the range "'',0,'',11" in the "Description" ousupsub editor
    And I click on "Superscript" "button"
    Then I should see "<sup>Superscript</sup> and <sub>Subscript</sub>" in the "Description" ousupsub editor
    
    # Return superscript to normal
    When I select the range "'sup',0,'sup',11" in the "Description" ousupsub editor
    And I click on "Superscript" "button"
    Then I should see "<span>Superscript</span> and <sub>Subscript</sub>" in the "Description" ousupsub editor
    
    # Return subscript to normal
    When I select the range "'sub',0,'sub',9" in the "Description" ousupsub editor
    And I click on "Subscript" "button"
    Then I should see "<span>Superscript</span> and <span>Subscript</span>" in the "Description" ousupsub editor
    
    # Re-apply subscript
    When I select the range "'span:nth-child(2)', 0, 'span:nth-child(2)', 9" in the "Description" ousupsub editor
    And I click on "Subscript" "button"
    Then I should see "<span>Superscript</span> and <span><sub>Subscript</sub></span>" in the "Description" ousupsub editor

    # Re-apply superscript
    When I select the range "'span', 0, 'span', 11" in the "Description" ousupsub editor
    And I click on "Superscript" "button"
    Then I should see "<span><sup>Superscript</sup></span> and <span><sub>Subscript</sub></span>" in the "Description" ousupsub editor

    # Return subscript to normal again
    When I select the range "'span:nth-child(2) > sub', 0, 'span:nth-child(2) > sub', 9" in the "Description" ousupsub editor
    And I click on "Subscript" "button" 

    # Apply subscript again
    And I click on "Subscript" "button"
    Then I should see "<span><sup>Superscript</sup></span> and <span><span><sub>Subscript</sub></span></span>" in the "Description" ousupsub editor

    # Return superscript to normal again
    When I select the range "'span > sup', 0, 'span > sup', 11" in the "Description" ousupsub editor
    And I click on "Superscript" "button"

    # Apply superscript again
    And I click on "Superscript" "button"
    Then I should see "<span><span><sup>Superscript</sup></span></span> and <span><span><sub>Subscript</sub></span></span>" in the "Description" ousupsub editor